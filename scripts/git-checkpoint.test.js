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

  test('rollbackCheckpoint restores dirty state without moving HEAD to stash commit', () => {
    const fs = require('fs');
    const os = require('os');
    const { execSync } = require('child_process');
    const { rollbackCheckpoint, isStashCommit } = require('./git-checkpoint.js');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-cp-test-'));
    try {
      execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
      execSync('git config user.email test@test.com', { cwd: tmpDir, stdio: 'pipe' });
      execSync('git config user.name "Test User"', { cwd: tmpDir, stdio: 'pipe' });

      // Initial commit
      fs.writeFileSync(path.join(tmpDir, 'test.txt'), 'initial content');
      execSync('git add test.txt && git commit -m "initial"', { cwd: tmpDir, stdio: 'pipe' });
      const initialHead = execSync('git rev-parse HEAD', { cwd: tmpDir, stdio: 'pipe' }).toString().trim();

      // Dirty uncommitted changes
      fs.writeFileSync(path.join(tmpDir, 'test.txt'), 'uncommitted work in progress');
      const cp = createCheckpoint('dirty_checkpoint', tmpDir);

      assert.ok(isStashCommit(cp.sha, tmpDir), 'Stash checkpoint should be recognized as stash commit');

      // Now introduce corrupt changes
      fs.writeFileSync(path.join(tmpDir, 'test.txt'), 'broken changes that must be rolled back');

      // Rollback
      const rollbackRes = rollbackCheckpoint(cp.id, tmpDir);
      assert.equal(rollbackRes.success, true);

      // Verify HEAD is still initialHead (not pointing to stash commit!)
      const currentHead = execSync('git rev-parse HEAD', { cwd: tmpDir, stdio: 'pipe' }).toString().trim();
      assert.equal(currentHead, initialHead, 'HEAD must remain on original commit');

      // Verify uncommitted work in progress is restored
      const restoredContent = fs.readFileSync(path.join(tmpDir, 'test.txt'), 'utf8');
      assert.equal(restoredContent, 'uncommitted work in progress');
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  });
});
