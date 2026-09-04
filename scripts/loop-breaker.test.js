const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const {
  tokenize,
  calculateJaccardSimilarity,
  recordExecution,
  checkLoopState,
  clearLedger
} = require('./loop-breaker.js');

describe('Anti-Loop Circuit Breaker Suite', () => {
  const tmpWorkspace = path.join(__dirname, '.test_loop_tmp');

  beforeEach(() => {
    fs.mkdirSync(tmpWorkspace, { recursive: true });
    clearLedger(tmpWorkspace);
  });

  afterEach(() => {
    clearLedger(tmpWorkspace);
    fs.rmSync(tmpWorkspace, { recursive: true, force: true });
  });

  test('tokenize extracts meaningful words from text', () => {
    const tokens = tokenize('AssertionError: expected true but got false');
    assert.ok(tokens.has('assertionerror'));
    assert.ok(tokens.has('expected'));
    assert.ok(tokens.has('true'));
  });

  test('calculateJaccardSimilarity calculates string overlap correctly', () => {
    const s1 = 'TypeError: Cannot read properties of undefined (reading foo)';
    const s2 = 'TypeError: Cannot read properties of undefined (reading foo)';
    const s3 = 'Database connection timed out on port 5432';

    assert.equal(calculateJaccardSimilarity(s1, s2), 1.0);
    assert.ok(calculateJaccardSimilarity(s1, s3) < 0.2);
  });

  test('records executions and trips circuit breaker after 3 consecutive failures', () => {
    const cmd = 'npm test';
    const errOut = 'AssertionError: expected 1 to equal 2\n    at test.js:10';

    // 1st failure
    const r1 = recordExecution(cmd, errOut, 1, tmpWorkspace);
    assert.equal(r1.breakerTriggered, false);

    // 2nd failure
    const r2 = recordExecution(cmd, errOut, 1, tmpWorkspace);
    assert.equal(r2.breakerTriggered, false);

    // 3rd failure: must trip circuit breaker!
    const r3 = recordExecution(cmd, errOut, 1, tmpWorkspace);
    assert.equal(r3.breakerTriggered, true);
    assert.equal(r3.isLooping, true);
    assert.ok(r3.advisorHint.includes('[CIRCUIT BREAKER: LOOP DETECTED]'));
    assert.ok(r3.advisorHint.includes('npm test'));
  });

  test('success breaks the consecutive failure streak', () => {
    const cmd = 'npm test';
    const errOut = 'Error: Fail';

    recordExecution(cmd, errOut, 1, tmpWorkspace);
    recordExecution(cmd, errOut, 1, tmpWorkspace);

    // Success breaks streak
    recordExecution(cmd, 'All tests pass', 0, tmpWorkspace);

    const state = checkLoopState(tmpWorkspace);
    assert.equal(state.breakerTriggered, false);
    assert.equal(state.streak, 0);
  });
});
