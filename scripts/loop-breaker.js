#!/usr/bin/env node
/**
 * Anti-Loop Circuit Breaker & Stuck State Recovery Engine
 * Part of Antigravity Ecosystem Harness Engineering (2026)
 *
 * Capabilities:
 * - Detects repetitive tool/command invocations and identical error cycles.
 * - Similarity-based loop detection (Jaccard similarity on failure outputs).
 * - Enforces hard circuit-breaker thresholds (default: 3 consecutive failures).
 * - Generates Out-of-Band Advisor diagnostic hints to break deadlocks.
 * - Can be called standalone or seamlessly hooked into aci-condenser.js.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_CONSECUTIVE_FAILURES = 3;
const SIMILARITY_THRESHOLD = 0.80; // 80% output similarity

function tokenize(text) {
  if (!text || typeof text !== 'string') return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(words);
}

function calculateJaccardSimilarity(textA, textB) {
  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionSize++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 1.0 : intersectionSize / unionSize;
}

function getLedgerPath(workspaceDir = process.cwd()) {
  const agentsDir = path.join(workspaceDir, '.agents');
  if (!fs.existsSync(agentsDir)) {
    try {
      fs.mkdirSync(agentsDir, { recursive: true });
    } catch {}
  }
  return path.join(agentsDir, 'loop-ledger.json');
}

function readLedger(workspaceDir = process.cwd()) {
  const ledgerPath = getLedgerPath(workspaceDir);
  if (!fs.existsSync(ledgerPath)) return { history: [] };
  try {
    const raw = fs.readFileSync(ledgerPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { history: [] };
  }
}

function saveLedger(ledger, workspaceDir = process.cwd()) {
  const ledgerPath = getLedgerPath(workspaceDir);
  try {
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
  } catch {}
}

function clearLedger(workspaceDir = process.cwd()) {
  const ledgerPath = getLedgerPath(workspaceDir);
  if (fs.existsSync(ledgerPath)) {
    try {
      fs.unlinkSync(ledgerPath);
    } catch {}
  }
}

function recordExecution(command, output, exitCode, workspaceDir = process.cwd()) {
  const ledger = readLedger(workspaceDir);
  const trimmedCmd = (command || '').trim();
  const cleanOutput = (output || '').trim();
  const diagnosticSnippet = cleanOutput.length > 5000
    ? cleanOutput.slice(0, 2500) + '\n...\n' + cleanOutput.slice(-2500)
    : cleanOutput;
  const outputHash = crypto.createHash('sha256').update(cleanOutput).digest('hex').slice(0, 16);

  const entry = {
    timestamp: Date.now(),
    command: trimmedCmd,
    exitCode: exitCode || 0,
    outputHash,
    snippet: diagnosticSnippet
  };

  ledger.history.push(entry);
  if (ledger.history.length > 20) {
    ledger.history = ledger.history.slice(-20);
  }

  saveLedger(ledger, workspaceDir);
  return checkLoopState(workspaceDir, cleanOutput);
}

function checkLoopState(workspaceDir = process.cwd(), currentOutput = '') {
  const ledger = readLedger(workspaceDir);
  const history = ledger.history;

  if (history.length < 2) {
    return { isLooping: false, breakerTriggered: false };
  }

  // Look at recent consecutive failure streak
  const recentFailures = [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].exitCode !== 0) {
      recentFailures.push(history[i]);
    } else {
      break; // Streak broken by success
    }
  }

  const streak = recentFailures.length;

  if (streak >= MAX_CONSECUTIVE_FAILURES) {
    // Check if commands are identical
    const allSameCommand = recentFailures.every((f) => f.command === recentFailures[0].command);

    // Check similarity between first and last failure in streak
    const firstSnippet = recentFailures[recentFailures.length - 1].snippet;
    const latestSnippet = recentFailures[0].snippet || currentOutput;
    const similarity = calculateJaccardSimilarity(firstSnippet, latestSnippet);

    if (allSameCommand || similarity >= SIMILARITY_THRESHOLD) {
      return {
        isLooping: true,
        breakerTriggered: true,
        streak,
        similarity: parseFloat(similarity.toFixed(2)),
        loopType: allSameCommand ? 'IDENTICAL_COMMAND_REPEAT' : 'OUTPUT_STAGNATION',
        advisorHint: [
          `[CIRCUIT BREAKER: LOOP DETECTED] Streak: ${streak} consecutive failures | Similarity: ${(similarity * 100).toFixed(0)}%`,
          `ADVISOR HINT: You are repeating the same failing trajectory for "${recentFailures[0].command}".`,
          'ACTION REQUIRED: STOP immediately. Do NOT run this command again without fundamentally altering your hypothesis.',
          'Check .agents/scratchpad.md for eliminated paths, or rollback via: node scripts/git-checkpoint.js rollback'
        ].join('\n')
      };
    }
  }

  return {
    isLooping: false,
    breakerTriggered: false,
    streak
  };
}

// CLI Execution
if (require.main === module) {
  const [,, cmd, arg1, arg2] = process.argv;

  switch (cmd) {
    case 'check': {
      const state = checkLoopState();
      console.log(JSON.stringify(state, null, 2));
      break;
    }
    case 'clear': {
      clearLedger();
      console.log('[LOOP BREAKER] Ledger cleared.');
      break;
    }
    case 'status': {
      const ledger = readLedger();
      console.log(`[LOOP BREAKER] History: ${ledger.history.length} records`);
      const state = checkLoopState();
      console.log(`Status: ${state.breakerTriggered ? 'TRIPPED' : 'CLEAR'} (Streak: ${state.streak || 0})`);
      break;
    }
    default: {
      console.log('Usage: node loop-breaker.js <check|clear|status>');
      process.exit(0);
    }
  }
}

module.exports = {
  tokenize,
  calculateJaccardSimilarity,
  recordExecution,
  checkLoopState,
  readLedger,
  clearLedger,
  MAX_CONSECUTIVE_FAILURES,
  SIMILARITY_THRESHOLD
};
