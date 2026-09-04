const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  analyzeTask,
  profileWorkspace,
  formatTtcSummary,
  TIER_DEFINITIONS
} = require('./ttc-profiler');

describe('Adaptive Test-Time Compute (TTC) Profiler Suite', () => {
  it('classifies trivial typos and doc edits as Tier 1 (Atomic Fast Path)', () => {
    const profile = analyzeTask('Fix typo in README comments and formatting');
    assert.strictEqual(profile.tier, 1);
    assert.strictEqual(profile.maxSubagents, 0);
    assert.strictEqual(profile.maxTurns, 2);
    assert.ok(profile.recommendedHarness.includes('Direct Surgical Edit'));
  });

  it('classifies isolated component logic as Tier 2', () => {
    const profile = analyzeTask('Implement helper function for string validation');
    assert.strictEqual(profile.tier, 2);
    assert.strictEqual(profile.maxSubagents, 0);
    assert.strictEqual(profile.maxTurns, 4);
    assert.ok(profile.recommendedHarness.includes('TDD'));
  });

  it('classifies multi-file integration and state pipeline as Tier 3', () => {
    const profile = analyzeTask('Add user authentication endpoint and database regression tests');
    assert.strictEqual(profile.tier, 3);
    assert.strictEqual(profile.maxSubagents, 1);
    assert.strictEqual(profile.maxTurns, 8);
    assert.ok(profile.requiredGuards.includes('scratchpad-ledger'));
  });

  it('classifies architectural refactors and migrations as Tier 4', () => {
    const profile = analyzeTask('Refactor data pipeline architecture and execute schema migration');
    assert.strictEqual(profile.tier, 4);
    assert.strictEqual(profile.maxSubagents, 2);
    assert.ok(profile.requiredGuards.includes('git-checkpoint'));
    assert.ok(profile.requiredGuards.includes('dual-agent-auditor'));
  });

  it('classifies high-stakes concurrency and benchmarks as Tier 5 (Max Compute Ceiling)', () => {
    const profile = analyzeTask('Fix thundering herd race condition and benchmark async circuit breaker under high concurrency');
    assert.strictEqual(profile.tier, 5);
    assert.strictEqual(profile.maxSubagents, 3); // Capped at Rule 10 ceiling
    assert.strictEqual(profile.maxTurns, 25);
    assert.ok(profile.requiredGuards.includes('dynamic-harness-runner'));
    assert.ok(profile.requiredGuards.includes('lessons-ledger'));
  });

  it('profileWorkspace scans active repo attributes without errors', () => {
    const ws = profileWorkspace(process.cwd());
    assert.strictEqual(typeof ws.gitAvailable, 'boolean');
    assert.strictEqual(typeof ws.modifiedFiles, 'number');
    assert.strictEqual(typeof ws.hasActiveScratchpad, 'boolean');
  });

  it('formatTtcSummary outputs structured markdown report', () => {
    const profile = analyzeTask('Benchmark race conditions');
    const summary = formatTtcSummary(profile);
    assert.ok(summary.includes('[TTC PROFILER:'));
    assert.ok(summary.includes('Milestone Execution DAG:'));
  });
});
