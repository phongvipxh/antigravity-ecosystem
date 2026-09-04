#!/usr/bin/env node
/**
 * Ephemeral Git Micro-Checkpointing Engine
 * Part of Antigravity Ecosystem Harness Engineering (2026)
 *
 * Implements atomic transactional state checkpoints before risky mutations.
 * Uses isolated git refs (`refs/checkpoints/<id>`) and `git stash create` commit objects
 * so it never pollutes user branches or user git history.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function isGitRepo(cwd = process.cwd()) {
  try {
    const res = execSync('git rev-parse --is-inside-work-tree', { cwd, stdio: 'pipe' }).toString().trim();
    return res === 'true';
  } catch {
    return false;
  }
}

function getHeadSha(cwd = process.cwd()) {
  try {
    return execSync('git rev-parse HEAD', { cwd, stdio: 'pipe' }).toString().trim();
  } catch {
    return null;
  }
}

function createCheckpoint(label = 'checkpoint', cwd = process.cwd()) {
  if (!isGitRepo(cwd)) {
    throw new Error(`Directory "${cwd}" is not inside a git repository.`);
  }

  const timestamp = Date.now();
  const sanitizedLabel = label.replace(/[^a-zA-Z0-9_-]/g, '_');
  const checkpointId = `${timestamp}_${sanitizedLabel}`;
  const refName = `refs/checkpoints/${checkpointId}`;

  // First, check if there are any working tree or staged changes
  const status = execSync('git status --porcelain', { cwd, stdio: 'pipe' }).toString().trim();
  let commitSha = '';

  if (status.length === 0) {
    // Clean working tree, point checkpoint directly to HEAD
    commitSha = getHeadSha(cwd);
    if (!commitSha) {
      throw new Error('Repository has no commits to create a checkpoint from.');
    }
  } else {
    // Working tree has changes: use git stash create to create an orphaned commit object
    // git stash create creates a dangling commit object without touching refs/stash or worktree!
    try {
      commitSha = execSync(`git stash create "checkpoint: ${sanitizedLabel}"`, { cwd, stdio: 'pipe' }).toString().trim();
    } catch {
      commitSha = '';
    }

    if (!commitSha) {
      // Fallback if stash create returns empty (e.g. untracked files only):
      commitSha = getHeadSha(cwd);
    }
  }

  if (!commitSha) {
    throw new Error('Repository has no commits or valid stash to create a checkpoint from.');
  }

  // Record into isolated refs/checkpoints/<id>
  execSync(`git update-ref "${refName}" ${commitSha}`, { cwd, stdio: 'pipe' });

  return {
    id: checkpointId,
    ref: refName,
    sha: commitSha,
    timestamp,
    label: sanitizedLabel,
    hadDirtyWorkingTree: status.length > 0
  };
}

function listCheckpoints(cwd = process.cwd()) {
  if (!isGitRepo(cwd)) return [];

  try {
    const rawRefs = execSync('git for-each-ref --format="%(refname) %(objectname)" refs/checkpoints/', {
      cwd,
      stdio: 'pipe'
    }).toString().trim();

    if (!rawRefs) return [];

    return rawRefs.split('\n').map((line) => {
      const [ref, sha] = line.trim().split(/\s+/);
      const id = ref.replace('refs/checkpoints/', '');
      const [ts, ...labelParts] = id.split('_');
      return {
        id,
        ref,
        sha,
        timestamp: parseInt(ts, 10) || 0,
        label: labelParts.join('_')
      };
    });
  } catch {
    return [];
  }
}

function isStashCommit(sha, cwd = process.cwd()) {
  try {
    const parent2 = execSync(`git rev-parse "${sha}^2"`, { cwd, stdio: 'pipe' }).toString().trim();
    if (!parent2) return false;
    const subject = execSync(`git log -1 --format="%s" ${sha}`, { cwd, stdio: 'pipe' }).toString().trim();
    return /^(?:WIP on |.*: (?:checkpoint: |WIP on )|checkpoint: )/i.test(subject);
  } catch {
    return false;
  }
}

function rollbackCheckpoint(targetIdOrSha, cwd = process.cwd()) {
  if (!isGitRepo(cwd)) {
    throw new Error(`Directory "${cwd}" is not inside a git repository.`);
  }

  let sha = targetIdOrSha;
  if (!/^[0-9a-f]{7,64}$/i.test(targetIdOrSha)) {
    // Treat as checkpoint ID or label
    const checkpoints = listCheckpoints(cwd);
    const match = checkpoints.find((cp) => cp.id === targetIdOrSha || cp.label === targetIdOrSha);
    if (!match) {
      throw new Error(`Checkpoint "${targetIdOrSha}" not found.`);
    }
    sha = match.sha;
  }

  // Cleanly restore working tree and index
  try {
    if (isStashCommit(sha, cwd)) {
      // Stash commit: reset HEAD to base commit, then apply stashed changes
      const parent1 = execSync(`git rev-parse "${sha}^1"`, { cwd, stdio: 'pipe' }).toString().trim();
      execSync(`git reset --hard ${parent1}`, { cwd, stdio: 'pipe' });
      try {
        execSync(`git stash apply --index ${sha}`, { cwd, stdio: 'pipe' });
      } catch {
        execSync(`git stash apply ${sha}`, { cwd, stdio: 'pipe' });
      }
    } else {
      // Regular commit: reset directly
      execSync(`git reset --hard ${sha}`, { cwd, stdio: 'pipe' });
    }
    return {
      success: true,
      rolledBackToSha: sha
    };
  } catch (err) {
    throw new Error(`Failed to rollback to ${sha}: ${err.message}`);
  }
}

function cleanupCheckpoints(maxAgeHours = 24, cwd = process.cwd()) {
  if (!isGitRepo(cwd)) return 0;

  const checkpoints = listCheckpoints(cwd);
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 3600 * 1000;
  let deletedCount = 0;

  for (const cp of checkpoints) {
    if (now - cp.timestamp >= maxAgeMs) {
      try {
        execSync(`git update-ref -d "${cp.ref}"`, { cwd, stdio: 'pipe' });
        deletedCount++;
      } catch {}
    }
  }

  return deletedCount;
}

// CLI Interface
if (require.main === module) {
  const [,, command, arg] = process.argv;

  switch (command) {
    case 'create': {
      const res = createCheckpoint(arg || 'checkpoint');
      console.log(`[CHECKPOINT CREATED] ID: ${res.id} (SHA: ${res.sha.slice(0, 8)})`);
      break;
    }
    case 'list': {
      const list = listCheckpoints();
      console.log(`[CHECKPOINTS] Total: ${list.length}`);
      list.forEach((cp) => {
        const date = new Date(cp.timestamp).toISOString();
        console.log(`- ${cp.id} | ${cp.sha.slice(0, 8)} | ${date}`);
      });
      break;
    }
    case 'rollback': {
      if (!arg) {
        console.error('Error: specify checkpoint ID or label to rollback to.');
        process.exit(1);
      }
      const res = rollbackCheckpoint(arg);
      console.log(`[ROLLBACK SUCCESS] Restored to ${res.rolledBackToSha.slice(0, 8)}`);
      break;
    }
    case 'cleanup': {
      const hours = arg !== undefined ? parseFloat(arg) : 24;
      const count = cleanupCheckpoints(hours);
      console.log(`[CLEANUP] Pruned ${count} old checkpoints.`);
      break;
    }
    default: {
      console.log('Usage: node git-checkpoint.js <create|list|rollback|cleanup> [label/id]');
      process.exit(0);
    }
  }
}

module.exports = {
  isGitRepo,
  getHeadSha,
  isStashCommit,
  createCheckpoint,
  listCheckpoints,
  rollbackCheckpoint,
  cleanupCheckpoints
};
