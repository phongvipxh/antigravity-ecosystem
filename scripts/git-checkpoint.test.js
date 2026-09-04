const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const {
  isGitRepo,
  getHeadSha,
  createCheckpoint,
  listCheckpoints,
  cleanupCheckpoints
} = require('./git-checkpoint.js');

describe('Git Micro-Checkpointing Suite', () => {
  const repoRoot = path.resolve(__dirname, '..');

  test('isGitRepo correctly identifies current git repository', () => {
    assert.equal(isGitRepo(repoRoot), true);
  });

  test('getHeadSha returns valid 40-character commit hash', () => {
    const head = getHeadSha(repoRoot);
    assert.ok(head, 'HEAD sha should exist');
    assert.match(head, /^[0-9a-f]{40}$/);
  });

  test('createCheckpoint and listCheckpoints work atomically', () => {
    const label = 'unit_test_checkpoint';
    const cp = createCheckpoint(label, repoRoot);

    assert.ok(cp.id.includes(label));
    assert.match(cp.sha, /^[0-9a-f]{40}$/);

    const list = listCheckpoints(repoRoot);
    assert.ok(list.some((item) => item.id === cp.id));
  });

  test('cleanupCheckpoints prunes expired checkpoints', () => {
    // Calling cleanup with 0 maxAgeHours will prune all checkpoints created in previous tests
    const pruned = cleanupCheckpoints(0, repoRoot);
    assert.ok(pruned >= 1, 'Should have pruned at least the test checkpoint');

    const list = listCheckpoints(repoRoot);
    assert.equal(list.length, 0);
  });
});
