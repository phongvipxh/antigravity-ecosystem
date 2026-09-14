// scripts/file-cache.test.js
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { FileStateCache } = require('./file-cache');

describe('File State Cache Engine Suite (Claude Code Inspired)', () => {
  let cache;
  let tempDir;
  let testFile;

  beforeEach(() => {
    cache = new FileStateCache({ maxEntries: 10 });
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-cache-test-'));
    testFile = path.join(tempDir, 'sample.txt');
    fs.writeFileSync(testFile, 'Line 1\nLine 2\nLine 3\n');
  });

  it('records initial file read as a cache miss', () => {
    const res = cache.check(testFile);
    assert.strictEqual(res.exists, true);
    assert.strictEqual(res.hit, false);
    assert.strictEqual(res.isModified, true);
    assert.strictEqual(res.lineCount, 4);
    assert.ok(res.sha256);
  });

  it('detects redundant file read as a cache hit when file unchanged', () => {
    cache.check(testFile); // first read (miss)
    const res2 = cache.check(testFile); // second read (hit)
    assert.strictEqual(res2.hit, true);
    assert.strictEqual(res2.isModified, false);

    const metrics = cache.getMetrics();
    assert.strictEqual(metrics.hits, 1);
    assert.strictEqual(metrics.misses, 1);
    assert.strictEqual(metrics.hitRate, '50.0%');
  });

  it('detects modification when file content changes', () => {
    cache.check(testFile);
    // Mutate file
    fs.appendFileSync(testFile, 'Line 4\n');
    // Ensure mtime changes even on fast filesystems
    const future = new Date(Date.now() + 2000);
    fs.utimesSync(testFile, future, future);

    const res = cache.check(testFile);
    assert.strictEqual(res.hit, false);
    assert.strictEqual(res.isModified, true);
    assert.strictEqual(res.lineCount, 5);
  });

  it('handles invalidation and eviction properly', () => {
    cache.check(testFile);
    assert.strictEqual(cache.cache.size, 1);

    cache.invalidate(testFile);
    assert.strictEqual(cache.cache.size, 0);

    const res = cache.check(testFile);
    assert.strictEqual(res.hit, false);
  });
});
