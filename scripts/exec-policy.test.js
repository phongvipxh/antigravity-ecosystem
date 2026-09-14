// scripts/exec-policy.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  tokenizeCommand,
  evaluateCommand,
  validatePolicies,
  DEFAULT_POLICIES
} = require('./exec-policy');

describe('Command Execution Policy Suite (Codex-Inspired)', () => {
  it('tokenizes commands with spaces and quotes correctly', () => {
    const tokens = tokenizeCommand('git commit -m "feat: initial commit"');
    assert.deepStrictEqual(tokens, ['git', 'commit', '-m', 'feat: initial commit']);
  });

  it('allows safe inspection and testing commands (ALLOW)', () => {
    const r1 = evaluateCommand('git status');
    assert.strictEqual(r1.decision, 'allow');

    const r2 = evaluateCommand('npm test');
    assert.strictEqual(r2.decision, 'allow');

    const r3 = evaluateCommand('node --test scripts/*.test.js');
    assert.strictEqual(r3.decision, 'allow');

    const r4 = evaluateCommand('dir');
    assert.strictEqual(r4.decision, 'allow');
  });

  it('prompts on state-mutating and package management commands (PROMPT)', () => {
    const r1 = evaluateCommand('npm install express');
    assert.strictEqual(r1.decision, 'prompt');

    const r2 = evaluateCommand('git commit -m "update"');
    assert.strictEqual(r2.decision, 'prompt');

    const r3 = evaluateCommand('npm run build');
    assert.strictEqual(r3.decision, 'prompt');
  });

  it('strictly blocks catastrophic destructive commands with alternative (FORBIDDEN)', () => {
    const r1 = evaluateCommand('git reset --hard');
    assert.strictEqual(r1.decision, 'forbidden');
    assert(r1.justification.includes('irreversibly'));
    assert(r1.alternative.includes('checkpoint'));

    const r2 = evaluateCommand('git clean -fdx');
    assert.strictEqual(r2.decision, 'forbidden');

    const r3 = evaluateCommand('rm -rf /');
    assert.strictEqual(r3.decision, 'forbidden');
  });

  it('passes all embedded load-time match and not_match assertions', () => {
    const testResults = validatePolicies(DEFAULT_POLICIES);
    assert(testResults.length > 10, 'Expected at least 10 policy assertions');
    const failures = testResults.filter(r => !r.pass);
    assert.strictEqual(failures.length, 0, `Failed assertions: ${JSON.stringify(failures)}`);
  });
});
