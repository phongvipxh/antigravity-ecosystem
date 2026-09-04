const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const {
  estimateTokens,
  getFileHash,
  auditContextBudget,
  auditSkillsIntegrity,
  auditToolchain,
  auditSecretLeaks,
  runFullCheckup,
  formatReport
} = require('./checkup.js');

describe('System Checkup Diagnostic Suite', () => {
  const repoRoot = path.resolve(__dirname, '..');

  test('estimateTokens calculates reasonable token approximation', () => {
    const text = 'Hello world! This is a test.'; // 28 chars
    const tokens = estimateTokens(text);
    assert.equal(tokens, 7);
  });

  test('getFileHash returns deterministic SHA-256 hash', () => {
    const readmePath = path.join(repoRoot, 'README.md');
    const hash = getFileHash(readmePath);
    assert.ok(hash);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  test('auditContextBudget evaluates total rule tokens', () => {
    const result = auditContextBudget();
    assert.ok(['PASS', 'WARN'].includes(result.status));
    assert.ok(result.totalRuleTokens > 0);
    assert.ok(result.ruleCount >= 10);
  });

  test('auditSkillsIntegrity validates installed skills', () => {
    const result = auditSkillsIntegrity();
    assert.ok(['PASS', 'WARN'].includes(result.status));
    assert.ok(result.skillCount >= 18);
  });

  test('auditToolchain identifies node and git runtimes', () => {
    const result = auditToolchain();
    assert.equal(result.status, 'PASS');
    assert.ok(result.details.some((d) => d.includes('Node.js runtime')));
    assert.ok(result.details.some((d) => d.includes('Git VCS')));
  });

  test('auditSecretLeaks flags deliberate test leaks and passes clean dirs', () => {
    const tmpDir = path.join(__dirname, '.test_tmp');
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      const cleanFile = path.join(tmpDir, 'clean.md');
      fs.writeFileSync(cleanFile, '# Clean Rule\nNo secrets here.');
      const cleanRes = auditSecretLeaks([tmpDir]);
      assert.equal(cleanRes.status, 'PASS');

      const dirtyFile = path.join(tmpDir, 'leak.md');
      fs.writeFileSync(dirtyFile, 'API_KEY = "sk-ant-12345678901234567890123456789012"');
      const dirtyRes = auditSecretLeaks([tmpDir]);
      assert.equal(dirtyRes.status, 'FAIL');
      assert.ok(dirtyRes.details.some((d) => d.includes('Anthropic API Key')));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('runFullCheckup generates complete diagnostic report', () => {
    const report = runFullCheckup({ repoRoot });
    assert.ok(report.timestamp);
    assert.ok(['PASS', 'WARN', 'FAIL'].includes(report.overallStatus));
    assert.equal(report.audits.length, 6);

    const formatted = formatReport(report);
    assert.ok(formatted.includes('ANTIGRAVITY SYSTEM CHECKUP & HEALTH DIAGNOSTIC'));
    assert.ok(formatted.includes('Context Budget & Dead Weight'));
  });
});
