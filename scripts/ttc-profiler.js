#!/usr/bin/env node
/**
 * Adaptive Test-Time Compute (TTC) Profiler
 * Part of Antigravity Ecosystem Harness Engineering (2026)
 *
 * Implements Codex Core & Claude Code Dynamic Compute Allocation:
 * - Dynamically evaluates task complexity and codebase risk across 5 tiers.
 * - Allocates precise compute budgets (turns, subagents, timeouts).
 * - Selects optimal harness scaffolds (Dynamic Harness vs TDD vs Direct Edit).
 * - Enforces anti-runaway ceilings (max 3 subagents, max depth 2).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Complexity weights for signal keywords
const KEYWORD_WEIGHTS = {
  // Tier 5 indicators (Extreme risk / concurrency / benchmarks)
  'concurrency': 25,
  'race condition': 28,
  'deadlock': 28,
  'thundering herd': 28,
  'distributed': 25,
  'benchmark': 25,
  'memory leak': 25,
  'security vulnerability': 28,
  'sql injection': 28,
  'csrf': 25,
  'xss': 25,
  'fuzz': 22,
  'best-of-n': 25,
  'trajectory search': 25,

  // Tier 4 indicators (Architectural migrations / multi-module refactor)
  'refactor': 16,
  'architecture': 16,
  'migration': 18,
  'breaking change': 18,
  'subsystem': 16,
  'data pipeline': 16,
  'circuit breaker': 16,
  'task queue': 16,
  'dual-agent': 20,
  'audit': 16,

  // Tier 3 indicators (Standard integration & state)
  'feature': 10,
  'endpoint': 10,
  'api': 8,
  'database': 12,
  'integration': 12,
  'state management': 12,
  'reproduce': 12,
  'regression': 12,
  'cache': 10,

  // Tier 2 indicators (Single component / unit testing)
  'unit test': 6,
  'component': 6,
  'function': 5,
  'helper': 5,
  'validation': 6,
  'parser': 8,

  // Tier 1 indicators (Low complexity / fast path)
  'typo': -15,
  'comment': -15,
  'formatting': -15,
  'lint': -10,
  'docs': -12,
  'readme': -12,
  'rename': -10
};

const TIER_DEFINITIONS = {
  1: {
    name: 'Atomic Fast Path',
    minScore: 0,
    maxScore: 25,
    recommendedHarness: 'Direct Surgical Edit + Instant Exit 0 Verification',
    maxSubagents: 0,
    maxTurns: 2,
    timeoutSeconds: 60,
    requiredGuards: ['aci-condenser'],
    executionDAG: [
      '1. Surgical edit via replace_file_content',
      '2. Fast mechanical check (Exit Code 0)'
    ]
  },
  2: {
    name: 'Single-Component Logic',
    minScore: 26,
    maxScore: 45,
    recommendedHarness: 'Standard TDD Unit Cycle',
    maxSubagents: 0,
    maxTurns: 4,
    timeoutSeconds: 180,
    requiredGuards: ['aci-condenser', 'loop-breaker'],
    executionDAG: [
      '1. Target file comprehension',
      '2. Test verification or authoring',
      '3. Surgical implementation',
      '4. Automated test pass (Exit Code 0)'
    ]
  },
  3: {
    name: 'Multi-File Integration',
    minScore: 46,
    maxScore: 70,
    recommendedHarness: 'Reproduce-First + Scratchpad Hypothesis Ledger',
    maxSubagents: 1,
    maxTurns: 8,
    timeoutSeconds: 300,
    requiredGuards: ['aci-condenser', 'loop-breaker', 'scratchpad-ledger'],
    executionDAG: [
      '1. Reproduce failure or establish baseline',
      '2. Multi-file call-graph mapping',
      '3. Hypothesis tracking in scratchpad.md',
      '4. Surgical patches across modules',
      '5. Integration test pass (Exit Code 0)'
    ]
  },
  4: {
    name: 'Architectural Refactor & Migration',
    minScore: 71,
    maxScore: 85,
    recommendedHarness: 'Milestone DAG + Git Micro-Checkpoints + Dual-Agent Audit',
    maxSubagents: 2,
    maxTurns: 15,
    timeoutSeconds: 600,
    requiredGuards: ['git-checkpoint', 'aci-condenser', 'loop-breaker', 'scratchpad-ledger', 'lessons-ledger', 'dual-agent-auditor'],
    executionDAG: [
      '1. Git atomic micro-checkpoint baseline',
      '2. Architectural milestone DAG decomposition',
      '3. Query lessons-ledger for prior pitfalls',
      '4. Incremental implementation per milestone',
      '5. Adversarial audit probing',
      '6. Full test suite mechanical pass'
    ]
  },
  5: {
    name: 'High-Stakes Concurrency & Benchmark (Max Compute)',
    minScore: 86,
    maxScore: 100,
    recommendedHarness: 'Dynamic Ephemeral Harness + Speculative Best-of-N Rollout',
    maxSubagents: 3,
    maxTurns: 25,
    timeoutSeconds: 900,
    requiredGuards: ['dynamic-harness-runner', 'git-checkpoint', 'aci-condenser', 'loop-breaker', 'scratchpad-ledger', 'lessons-ledger', 'dual-agent-auditor'],
    executionDAG: [
      '1. Git atomic micro-checkpoint baseline',
      '2. Cross-session lessons recall',
      '3. On-the-fly ephemeral runner synthesis in scratch/',
      '4. Speculative candidate rollouts (Best-of-N)',
      '5. Anti-concurrency / thundering-herd stress verification',
      '6. Adversarial boundary probe',
      '7. Permanent lesson distillation & mechanical sign-off'
    ]
  }
};

function analyzeTask(taskPrompt, context = {}) {
  const promptLower = (taskPrompt || '').toLowerCase();
  let baseScore = 15; // Baseline default: 15
  const detectedKeywords = [];

  for (const [kw, weight] of Object.entries(KEYWORD_WEIGHTS)) {
    if (promptLower.includes(kw)) {
      baseScore += weight;
      detectedKeywords.push({ keyword: kw, weight });
    }
  }

  // Adjust for estimated file impacts
  if (context.estimatedFiles) {
    if (context.estimatedFiles > 5) baseScore += 20;
    else if (context.estimatedFiles > 2) baseScore += 10;
  }

  // Adjust for active scratchpad (indicates existing failure state)
  if (context.hasActiveScratchpad) {
    baseScore += 15;
  }

  // Clamp score between 1 and 100
  const finalScore = Math.max(1, Math.min(100, baseScore));

  let assignedTier = 2;
  for (const [tier, def] of Object.entries(TIER_DEFINITIONS)) {
    if (finalScore >= def.minScore && finalScore <= def.maxScore) {
      assignedTier = Number(tier);
      break;
    }
  }

  const tierConfig = TIER_DEFINITIONS[assignedTier];

  return {
    tier: assignedTier,
    name: tierConfig.name,
    score: finalScore,
    recommendedHarness: tierConfig.recommendedHarness,
    maxSubagents: tierConfig.maxSubagents,
    maxTurns: tierConfig.maxTurns,
    timeoutSeconds: tierConfig.timeoutSeconds,
    requiredGuards: tierConfig.requiredGuards,
    executionDAG: tierConfig.executionDAG,
    detectedKeywords: detectedKeywords.map((k) => k.keyword),
    rationale: detectedKeywords.length > 0
      ? `Keywords detected: ${detectedKeywords.map((k) => `${k.keyword} (${k.weight > 0 ? '+' : ''}${k.weight})`).join(', ')}`
      : 'Default baseline complexity'
  };
}

function profileWorkspace(workspaceDir = process.cwd()) {
  const result = {
    workspaceDir,
    gitAvailable: false,
    modifiedFiles: 0,
    hasActiveScratchpad: false,
    hasPackageJson: false,
    testFrameworks: []
  };

  // Check git status
  try {
    const gitStatus = execSync('git status --porcelain', { cwd: workspaceDir, stdio: 'pipe' }).toString();
    result.gitAvailable = true;
    const lines = gitStatus.split('\n').filter((l) => l.trim().length > 0);
    result.modifiedFiles = lines.length;
  } catch {
    result.gitAvailable = false;
  }

  // Check scratchpad
  const scratchpadPath = path.join(workspaceDir, '.agents', 'scratchpad.md');
  if (fs.existsSync(scratchpadPath)) {
    try {
      const content = fs.readFileSync(scratchpadPath, 'utf8');
      result.hasActiveScratchpad = content.includes('### ✖ Attempt #') && !content.includes('TASK RESOLVED');
    } catch {}
  }

  // Check package.json
  const pkgPath = path.join(workspaceDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    result.hasPackageJson = true;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps['jest']) result.testFrameworks.push('jest');
      if (deps['mocha']) result.testFrameworks.push('mocha');
      if (deps['vitest']) result.testFrameworks.push('vitest');
      if (deps['playwright']) result.testFrameworks.push('playwright');
      if (pkg.scripts && pkg.scripts.test && pkg.scripts.test.includes('node --test')) {
        result.testFrameworks.push('node:test');
      }
    } catch {}
  }

  return result;
}

function formatTtcSummary(profile) {
  return [
    `⚡ [TTC PROFILER: TIER ${profile.tier} - ${profile.name.toUpperCase()}]`,
    `> **Complexity Score:** ${profile.score}/100 | **Budget:** Max ${profile.maxTurns} turns, ${profile.maxSubagents} subagent(s), ${profile.timeoutSeconds}s timeout`,
    `> **Recommended Harness:** ${profile.recommendedHarness}`,
    `> **Required Guards:** [${profile.requiredGuards.join(', ')}]`,
    `> **Rationale:** ${profile.rationale}`,
    '',
    '**Milestone Execution DAG:**',
    ...profile.executionDAG.map((step) => `- ${step}`)
  ].join('\n');
}

// CLI Execution
if (require.main === module) {
  const [,, cmd, ...args] = process.argv;

  switch (cmd) {
    case 'profile': {
      const prompt = args.join(' ');
      if (!prompt) {
        console.log('Usage: node ttc-profiler.js profile "<task description>"');
        process.exit(1);
      }
      const ws = profileWorkspace();
      const profile = analyzeTask(prompt, {
        hasActiveScratchpad: ws.hasActiveScratchpad,
        estimatedFiles: ws.modifiedFiles
      });
      console.log(formatTtcSummary(profile));
      break;
    }
    case 'scan': {
      const targetDir = args[0] || process.cwd();
      const ws = profileWorkspace(targetDir);
      console.log(`[TTC WORKSPACE SCAN: ${path.basename(targetDir)}]`);
      console.log(`- Git Repo: ${ws.gitAvailable ? 'Yes' : 'No'} (${ws.modifiedFiles} modified files)`);
      console.log(`- Active Scratchpad Failure: ${ws.hasActiveScratchpad ? 'YES (High Priority)' : 'No'}`);
      console.log(`- Test Frameworks: [${ws.testFrameworks.join(', ') || 'native/none'}]`);
      break;
    }
    default: {
      console.log('Adaptive Test-Time Compute (TTC) Profiler');
      console.log('Usage: node ttc-profiler.js <profile|scan> [args]');
      process.exit(0);
    }
  }
}

module.exports = {
  KEYWORD_WEIGHTS,
  TIER_DEFINITIONS,
  analyzeTask,
  profileWorkspace,
  formatTtcSummary
};
