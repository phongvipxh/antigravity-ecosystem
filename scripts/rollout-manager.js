// scripts/rollout-manager.js
/**
 * Trajectory Rollout & State Machine Engine (Inspired by OpenAI Codex rollout & session_index)
 * Tracks state-space exploration trees, candidate patches, verification milestones,
 * and provides deterministic backtracking to the closest verified checkpoint.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class RolloutManager {
  constructor(options = {}) {
    this.sessionId = options.sessionId || `session-${Date.now()}`;
    this.rootGoal = options.rootGoal || 'Task execution';
    this.nodes = new Map(); // nodeId -> Node
    this.activeNodeId = null;
    this.rootNodeId = null;
    this.initRoot();
  }

  generateId() {
    return 'node-' + crypto.randomBytes(4).toString('hex');
  }

  initRoot() {
    const rootId = this.generateId();
    const rootNode = {
      id: rootId,
      parentId: null,
      timestamp: Date.now(),
      action: 'Session initialized: ' + this.rootGoal,
      patchSha: 'root',
      testResult: { pass: true, exitCode: 0 },
      checkpointRef: 'HEAD',
      status: 'RESOLVED',
      children: []
    };
    this.nodes.set(rootId, rootNode);
    this.rootNodeId = rootId;
    this.activeNodeId = rootId;
  }

  /**
   * Records a new exploratory action or speculative rollout node.
   */
  recordStep({ action, patchSha, testResult = {}, checkpointRef = null, status = 'EXPLORING', parentId = null }) {
    const pid = parentId || this.activeNodeId;
    const parentNode = this.nodes.get(pid);
    if (!parentNode) {
      throw new Error(`Parent node '${pid}' does not exist.`);
    }

    const nodeId = this.generateId();
    const isPass = testResult && (testResult.pass === true || testResult.exitCode === 0);

    const node = {
      id: nodeId,
      parentId: pid,
      timestamp: Date.now(),
      action: action || 'Unspecified step',
      patchSha: patchSha || 'none',
      testResult: {
        pass: isPass,
        exitCode: testResult.exitCode !== undefined ? testResult.exitCode : (isPass ? 0 : 1),
        summary: testResult.summary || (isPass ? 'Passed' : 'Failed')
      },
      checkpointRef: checkpointRef || null,
      status: (status && status !== 'EXPLORING') ? status : (isPass ? 'RESOLVED' : 'DEAD_END'),
      children: []
    };

    parentNode.children.push(nodeId);
    this.nodes.set(nodeId, node);
    this.activeNodeId = nodeId;
    return node;
  }

  /**
   * Backtracks to the closest verified ancestor node that passed tests.
   */
  backtrack(fromNodeId = null) {
    let current = this.nodes.get(fromNodeId || this.activeNodeId);
    if (!current) return null;

    // Walk up the parent chain until finding a node with passing verification
    while (current) {
      if (current.id !== (fromNodeId || this.activeNodeId) && current.testResult.pass) {
        this.activeNodeId = current.id;
        return {
          targetNodeId: current.id,
          action: current.action,
          checkpointRef: current.checkpointRef,
          patchSha: current.patchSha
        };
      }
      if (!current.parentId) break;
      current = this.nodes.get(current.parentId);
    }

    // Default to root
    const root = this.nodes.get(this.rootNodeId);
    this.activeNodeId = root.id;
    return {
      targetNodeId: root.id,
      action: root.action,
      checkpointRef: root.checkpointRef,
      patchSha: root.patchSha
    };
  }

  /**
   * Exports all trajectory nodes to JSONL formatted string.
   */
  exportJsonl() {
    const lines = [];
    for (const node of this.nodes.values()) {
      lines.push(JSON.stringify(node));
    }
    return lines.join('\n');
  }

  /**
   * Loads trajectory nodes from JSONL string.
   */
  loadJsonl(jsonlStr) {
    if (!jsonlStr || !jsonlStr.trim()) return;
    this.nodes.clear();
    const lines = jsonlStr.trim().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      const node = JSON.parse(line);
      this.nodes.set(node.id, node);
      if (!node.parentId) {
        this.rootNodeId = node.id;
      }
      this.activeNodeId = node.id;
    }
  }

  /**
   * Returns summary statistics of the trajectory tree.
   */
  getSummary() {
    let resolved = 0;
    let deadEnds = 0;
    let exploring = 0;
    for (const n of this.nodes.values()) {
      if (n.status === 'RESOLVED') resolved++;
      else if (n.status === 'DEAD_END') deadEnds++;
      else exploring++;
    }
    return {
      sessionId: this.sessionId,
      totalNodes: this.nodes.size,
      resolvedNodes: resolved,
      deadEndNodes: deadEnds,
      activeNodeId: this.activeNodeId
    };
  }
}

module.exports = {
  RolloutManager
};
