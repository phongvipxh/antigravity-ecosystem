const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const {
  getScratchpadPath,
  readScratchpad,
  clearScratchpad,
  extractFailureCore,
  recordFailure,
  recordSuccess
} = require('./scratchpad-ledger.js');

describe('Scratchpad Memory Ledger Suite', () => {
  const tmpWorkspace = path.join(__dirname, '.test_scratchpad_tmp');

  beforeEach(() => {
    fs.mkdirSync(tmpWorkspace, { recursive: true });
    clearScratchpad(tmpWorkspace);
  });

  afterEach(() => {
    clearScratchpad(tmpWorkspace);
    fs.rmSync(tmpWorkspace, { recursive: true, force: true });
  });

  test('extractFailureCore isolates the highest-signal error line', () => {
    const raw = 'Building...\nAssertionError: Expected 200 to equal 404\n    at index.js:12';
    const core = extractFailureCore(raw);
    assert.equal(core, 'AssertionError: Expected 200 to equal 404');
  });

  test('recordFailure logs sequential attempts into scratchpad.md', () => {
    const r1 = recordFailure('npm test', 'Error: Network timeout', tmpWorkspace);
    assert.equal(r1.attemptNumber, 1);

    const r2 = recordFailure('npm test', 'Error: DB connection rejected', tmpWorkspace);
    assert.equal(r2.attemptNumber, 2);

    const content = readScratchpad(tmpWorkspace);
    assert.ok(content.includes('Attempt #1'));
    assert.ok(content.includes('Network timeout'));
    assert.ok(content.includes('Attempt #2'));
    assert.ok(content.includes('DB connection rejected'));
  });

  test('recordSuccess marks previous failures as resolved', () => {
    recordFailure('npm test', 'Error: Syntax error', tmpWorkspace);
    const res = recordSuccess('npm test', tmpWorkspace, 'Fixed missing bracket');

    assert.equal(res.resolved, true);
    const content = readScratchpad(tmpWorkspace);
    assert.ok(content.includes('TASK RESOLVED: MECHANICAL EXIT CODE 0 VERIFIED'));
    assert.ok(content.includes('Fixed missing bracket'));
  });

  test('clearScratchpad deletes the ledger file', () => {
    recordFailure('npm test', 'Error: Crash', tmpWorkspace);
    clearScratchpad(tmpWorkspace);

    const content = readScratchpad(tmpWorkspace);
    assert.equal(content, '');
  });
});
