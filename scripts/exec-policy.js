// scripts/exec-policy.js
/**
 * Deterministic Command Execution Policy Engine (Inspired by OpenAI codex-execpolicy)
 * Evaluates command tokens against prefix policies with decisions:
 * - 'allow': Safe read-only or testing commands executed autonomously.
 * - 'prompt': State-mutating commands that require checkpointing or notice.
 * - 'forbidden': Destructive or irreversible commands blocked with justification.
 */

const path = require('path');

// Built-in policy rules with load-time match / not_match verification
const DEFAULT_POLICIES = [
  // 1. FORBIDDEN (Destructive / High Blast-Radius)
  {
    id: 'forbid-hard-reset',
    pattern: ['git', 'reset', '--hard'],
    decision: 'forbidden',
    justification: 'Hard git reset destroys uncommitted working tree changes irreversibly.',
    alternative: 'Use ephemeral git checkpoints: node scripts/git-checkpoint.js create',
    match: ['git reset --hard', 'git reset --hard HEAD~1'],
    not_match: ['git reset', 'git reset --soft']
  },
  {
    id: 'forbid-clean-force',
    pattern: ['git', 'clean', ['-fd', '-fdx', '-f', '-xdf']],
    decision: 'forbidden',
    justification: 'Forced git clean permanently deletes untracked files and ignored artifacts.',
    alternative: 'Inspect untracked files first using git status or stash them safely.',
    match: ['git clean -fd', 'git clean -fdx'],
    not_match: ['git clean -n', 'git status']
  },
  {
    id: 'forbid-destructive-rm',
    pattern: [['rm', 'del', 'rmdir'], ['-rf', '-r', '/s', '/s /q'], ['/', '/*', 'C:\\', 'C:\\*']],
    decision: 'forbidden',
    justification: 'Recursive root deletion is catastrophic and irreversible.',
    alternative: 'Delete targeted relative paths within the project directory only.',
    match: ['rm -rf /', 'rmdir /s C:\\'],
    not_match: ['rm file.txt', 'del scratch/temp.txt']
  },
  {
    id: 'forbid-drop-database',
    pattern: [['drop', 'dropdb', 'truncate'], ['database', 'table', 'db']],
    decision: 'forbidden',
    justification: 'Dropping production or local databases destroys application state without rollback.',
    alternative: 'Use database migrations or test database teardown fixtures.',
    match: ['drop database production', 'truncate table users'],
    not_match: ['select * from database']
  },

  // 2. ALLOW (Deterministic Safe Inspection / Verification)
  {
    id: 'allow-git-inspect',
    pattern: ['git', ['status', 'diff', 'log', 'branch', 'show', 'rev-parse']],
    decision: 'allow',
    justification: 'Pure git read-only inspection operations are 100% reversible.',
    match: ['git status', 'git diff HEAD', 'git log -n 5', 'git branch -vv'],
    not_match: ['git push', 'git commit']
  },
  {
    id: 'allow-pytest',
    pattern: ['pytest'],
    decision: 'allow',
    justification: 'Python pytest runner execution is safe mechanical verification.',
    match: ['pytest'],
    not_match: ['python script.py']
  },
  {
    id: 'allow-test-runners',
    pattern: [
      ['node', 'npm', 'pnpm', 'yarn', 'cargo', 'go', 'python'],
      ['--test', 'test', 'run test', '-m unittest']
    ],
    decision: 'allow',
    justification: 'Automated test suite execution is standard mechanical verification (Rule 03).',
    match: ['node --test scripts/*.test.js', 'npm test', 'cargo test'],
    not_match: ['npm install', 'cargo publish']
  },
  {
    id: 'allow-dir-inspect',
    pattern: [['ls', 'dir', 'cat', 'head', 'tail', 'grep', 'pwd']],
    decision: 'allow',
    justification: 'Filesystem inspection and listing commands are read-only.',
    match: ['dir', 'ls -la', 'cat package.json', 'pwd'],
    not_match: ['mkdir newdir', 'cat file > overwrite.txt']
  },
  {
    id: 'allow-harness-scripts',
    pattern: ['node', ['scripts/checkup.js', 'scripts/aci-condenser.js', 'scripts/git-checkpoint.js', 'scripts/lessons-ledger.js', 'scripts/ttc-profiler.js', 'scripts/loop-breaker.js']],
    decision: 'allow',
    justification: 'Antigravity Harness engineering scripts are validated and safe.',
    match: ['node scripts/checkup.js', 'node scripts/aci-condenser.js'],
    not_match: ['node malware.js']
  },

  // 3. PROMPT (State Mutation / Build / Package Management)
  {
    id: 'prompt-pkg-install',
    pattern: [['npm', 'pnpm', 'yarn', 'pip', 'cargo'], ['install', 'i', 'add', 'update']],
    decision: 'prompt',
    justification: 'Installing packages modifies dependencies and lockfiles.',
    alternative: 'Run zero-hallucination package name check before installing (Rule 02).',
    match: ['npm install express', 'pip install requests', 'cargo add serde'],
    not_match: ['npm test', 'pip list']
  },
  {
    id: 'prompt-git-mutation',
    pattern: ['git', ['commit', 'checkout', 'switch', 'merge', 'rebase', 'stash']],
    decision: 'prompt',
    justification: 'VCS state mutation affects branch pointers and working tree.',
    match: ['git commit -m "feat: new feature"', 'git checkout -b feat/test'],
    not_match: ['git status', 'git diff']
  },
  {
    id: 'prompt-build-tools',
    pattern: [['npm', 'pnpm', 'yarn', 'cargo'], ['run build', 'build']],
    decision: 'prompt',
    justification: 'Build commands produce binaries and modify dist/target folders.',
    match: ['npm run build', 'cargo build'],
    not_match: ['npm test']
  }
];

/**
 * Tokenizes a command line string into an array of tokens, preserving quoted substrings.
 */
function tokenizeCommand(cmd) {
  if (!cmd || typeof cmd !== 'string') return [];
  const tokens = [];
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  let match;
  while ((match = regex.exec(cmd.trim())) !== null) {
    tokens.push(match[1] || match[2] || match[0]);
  }
  return tokens;
}

/**
 * Checks if a token matches a pattern token or alternative list.
 */
function tokenMatches(token, patternItem) {
  if (!token) return false;
  const normToken = token.toLowerCase().replace(/\\/g, '/');
  if (Array.isArray(patternItem)) {
    return patternItem.some(alt => normToken === alt.toLowerCase().replace(/\\/g, '/'));
  }
  return normToken === patternItem.toLowerCase().replace(/\\/g, '/');
}

/**
 * Evaluates a command string against policy rules.
 */
function evaluateCommand(cmdString, policies = DEFAULT_POLICIES) {
  const tokens = tokenizeCommand(cmdString);
  if (tokens.length === 0) {
    return { decision: 'allow', ruleId: 'empty-command', justification: 'Empty command.' };
  }

  // Check for destructive redirection or chain operators with forbidden patterns
  if (/\brm\s+-rf\b|\brmdir\s+\/s\b|\bgit\s+reset\s+--hard\b/i.test(cmdString)) {
    const hardRule = policies.find(p => p.id === 'forbid-hard-reset' || p.id === 'forbid-destructive-rm');
    if (hardRule) {
      return {
        decision: 'forbidden',
        ruleId: hardRule.id,
        justification: hardRule.justification,
        alternative: hardRule.alternative
      };
    }
  }

  // Check for shell redirection output writes (> or >>)
  if (tokens.some(t => t === '>' || t === '>>' || t.startsWith('>') || t.startsWith('>>'))) {
    return {
      decision: 'prompt',
      ruleId: 'prompt-redirection-write',
      justification: 'Command contains output file redirection (> or >>), mutating destination file.'
    };
  }

  // Iterate over policies
  for (const policy of policies) {
    let matches = true;
    for (let i = 0; i < policy.pattern.length; i++) {
      if (!tokens[i] || !tokenMatches(tokens[i], policy.pattern[i])) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return {
        decision: policy.decision,
        ruleId: policy.id,
        justification: policy.justification,
        alternative: policy.alternative || null
      };
    }
  }

  // Default fallback: If command not explicitly matched, safe if looks like inspect, else prompt
  const first = (tokens[0] || '').toLowerCase();
  if (['cat', 'echo', 'type', 'which', 'where'].includes(first)) {
    return { decision: 'allow', ruleId: 'default-inspect', justification: 'Standard inspection command.' };
  }

  return {
    decision: 'prompt',
    ruleId: 'default-unknown',
    justification: `Command '${tokens[0]}' has no explicit allow rule. Proceed with standard caution.`
  };
}

/**
 * Self-validates policies using embedded match/not_match examples.
 */
function validatePolicies(policies = DEFAULT_POLICIES) {
  const results = [];
  for (const p of policies) {
    if (p.match) {
      for (const ex of p.match) {
        const evalRes = evaluateCommand(ex, policies);
        const pass = evalRes.decision === p.decision;
        results.push({ ruleId: p.id, example: ex, expected: p.decision, actual: evalRes.decision, pass });
      }
    }
    if (p.not_match) {
      for (const ex of p.not_match) {
        const evalRes = evaluateCommand(ex, policies);
        const pass = evalRes.ruleId !== p.id;
        results.push({ ruleId: p.id, example: ex, expected: `not_${p.id}`, actual: evalRes.ruleId, pass });
      }
    }
  }
  return results;
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--test-policy') {
    const testResults = validatePolicies();
    const failures = testResults.filter(r => !r.pass);
    if (failures.length > 0) {
      console.error('[FAIL] Policy validation failed:', failures);
      process.exit(1);
    }
    console.log(`[PASS] All ${testResults.length} policy unit assertions passed.`);
    process.exit(0);
  }

  const cmd = args.join(' ');
  const res = evaluateCommand(cmd);
  console.log(JSON.stringify(res, null, 2));
  if (res.decision === 'forbidden') {
    process.exit(2);
  }
}

module.exports = {
  DEFAULT_POLICIES,
  tokenizeCommand,
  evaluateCommand,
  validatePolicies
};
