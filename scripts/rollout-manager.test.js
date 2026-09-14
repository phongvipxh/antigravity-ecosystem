// scripts/rollout-manager.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { RolloutManager } = require('./rollout-manager');

describe('Trajectory Rollout & State Machine Suite (Codex Inspired)', () => {
  it('initializes root node with resolved status', () => {
    const rm = new RolloutManager({ sessionId: 'test-sess', rootGoal: 'Fix issue #101' });
    const summary = rm.getSummary();
    assert.strictEqual(summary.totalNodes, 1);
    assert.strictEqual(summary.resolvedNodes, 1);
    assert.ok(summary.activeNodeId);
  });

  it('records branching candidate steps and tracks status', () => {
    const rm = new RolloutManager();
    const rootId = rm.activeNodeId;

    // Candidate 1: Passing
    const n1 = rm.recordStep({
      action: 'Candidate A: Implement queue limiter',
      patchSha: 'sha-aaa',
      testResult: { pass: true, exitCode: 0 },
      checkpointRef: 'refs/checkpoints/chk-1'
    });
    assert.strictEqual(n1.status, 'RESOLVED');
    assert.strictEqual(n1.parentId, rootId);

    // Candidate 2 off Candidate 1: Failing (Dead End)
    const n2 = rm.recordStep({
      action: 'Candidate B: Add risky lock',
      patchSha: 'sha-bbb',
      testResult: { pass: false, exitCode: 1 },
      checkpointRef: 'refs/checkpoints/chk-2'
    });
    assert.strictEqual(n2.status, 'DEAD_END');
    assert.strictEqual(n2.parentId, n1.id);
  });

  it('backtracks from a failing dead-end node to closest verified passing node', () => {
    const rm = new RolloutManager();
    const n1 = rm.recordStep({
      action: 'Milestone 1: Passing logic',
      patchSha: 'sha-m1',
      testResult: { pass: true, exitCode: 0 },
      checkpointRef: 'refs/checkpoints/m1'
    });

    const n2 = rm.recordStep({
      action: 'Speculative 2: Buggy attempt',
      patchSha: 'sha-m2',
      testResult: { pass: false, exitCode: 1 },
      checkpointRef: 'refs/checkpoints/m2'
    });

    assert.strictEqual(rm.activeNodeId, n2.id);

    // Backtrack should point back to n1
    const target = rm.backtrack();
    assert.strictEqual(target.targetNodeId, n1.id);
    assert.strictEqual(target.checkpointRef, 'refs/checkpoints/m1');
    assert.strictEqual(rm.activeNodeId, n1.id);
  });

  it('exports and reloads session trajectory tree as JSONL', () => {
    const rm = new RolloutManager({ sessionId: 'sess-jsonl' });
    rm.recordStep({ action: 'Step 1', patchSha: 'sha-1', testResult: { pass: true } });
    rm.recordStep({ action: 'Step 2', patchSha: 'sha-2', testResult: { pass: true } });

    const jsonl = rm.exportJsonl();
    assert.strictEqual(jsonl.split('\n').length, 3);

    const rm2 = new RolloutManager({ sessionId: 'sess-jsonl' });
    rm2.loadJsonl(jsonl);
    assert.strictEqual(rm2.nodes.size, 3);
  });
});
