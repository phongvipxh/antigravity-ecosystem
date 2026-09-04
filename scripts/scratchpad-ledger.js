#!/usr/bin/env node
/**
 * Hypothesis Ledger & Scratchpad Memory Buffer Engine
 * Part of Antigravity Ecosystem Harness Engineering (2026)
 *
 * Implements Praetorian & SWE-agent Memory Enforcement:
 * - Automatically tracks attempted hypotheses and reproduction failures in `.agents/scratchpad.md`.
 * - Prevents the "Groundhog Day" effect (re-attempting already eliminated fixes).
 * - Enforces systematic root-cause elimination across turns.
 * - Automatically archives/marks resolution upon mechanical Exit Code 0.
 */

const fs = require('fs');
const path = require('path');

function getScratchpadPath(workspaceDir = process.cwd()) {
  const agentsDir = path.join(workspaceDir, '.agents');
  if (!fs.existsSync(agentsDir)) {
    try {
      fs.mkdirSync(agentsDir, { recursive: true });
    } catch {}
  }
  return path.join(agentsDir, 'scratchpad.md');
}

function readScratchpad(workspaceDir = process.cwd()) {
  const filePath = getScratchpadPath(workspaceDir);
  if (!fs.existsSync(filePath)) return '';
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function clearScratchpad(workspaceDir = process.cwd()) {
  const filePath = getScratchpadPath(workspaceDir);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {}
  }
}

function extractFailureCore(rawOutput) {
  if (!rawOutput || typeof rawOutput !== 'string') return 'Unknown failure';
  const lines = rawOutput.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (/(?:Error|Exception|AssertionError|FAIL|FAILED):/i.test(line)) {
      return line.slice(0, 180);
    }
  }

  // Fallback to first non-empty line
  return lines[0] ? lines[0].slice(0, 180) : 'Non-zero exit code';
}

function maskSecrets(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/(?:sk-ant-[a-zA-Z0-9_-]{10,})/g, 'sk-ant-***[MASKED]')
    .replace(/(?:sk-[a-zA-Z0-9_-]{20,})/g, 'sk-***[MASKED]')
    .replace(/(?:ghp_[a-zA-Z0-9]{30,})/g, 'ghp_***[MASKED]')
    .replace(/(?:AIzaSy[a-zA-Z0-9_-]{28,})/g, 'AIzaSy***[MASKED]')
    .replace(/(?:Bearer\s+[a-zA-Z0-9_\-\.]{20,})/gi, 'Bearer ***[MASKED]');
}

function recordFailure(command, rawOutput, workspaceDir = process.cwd(), notes = '') {
  const filePath = getScratchpadPath(workspaceDir);
  const now = new Date().toISOString();
  const sanitizedCmd = maskSecrets(command || '');
  const sanitizedOutput = maskSecrets(rawOutput || '');
  const sanitizedNotes = maskSecrets(notes || '');
  const failureCore = extractFailureCore(sanitizedOutput);

  let existing = readScratchpad(workspaceDir);
  let attemptNumber = 1;

  if (existing.includes('### ✖ Attempt #')) {
    const matches = existing.match(/### ✖ Attempt #(\d+)/g);
    if (matches) {
      attemptNumber = matches.length + 1;
    }
  } else {
    // Initialize header
    existing = [
      '# 🧠 ACTIVE TASK HYPOTHESIS & SCRATCHPAD LEDGER',
      `> **Initialized:** ${now}`,
      '> **Status:** ⚠️ INVESTIGATING (Test/Command Failures Encountered)',
      '',
      '## 🚫 ELIMINATED HYPOTHESES & FAILED TRAJECTORIES (DO NOT REPEAT)',
      'The following approaches have been proven invalid. The agent is strictly prohibited from re-trying these identical actions.',
      ''
    ].join('\n');
  }

  const failureEntry = [
    `### ✖ Attempt #${attemptNumber} [${now}]`,
    `- **Command:** \`${sanitizedCmd}\``,
    `- **Failure Signature:** \`${failureCore}\``,
    sanitizedNotes ? `- **Notes:** ${sanitizedNotes}` : '- **Guideline:** Do not repeat this patch. Re-read surrounding code to formulate a new hypothesis.',
    '',
    '---',
    ''
  ].join('\n');

  const updated = existing + '\n' + failureEntry;
  try {
    fs.writeFileSync(filePath, updated, 'utf8');
  } catch {}

  return {
    filePath,
    attemptNumber,
    failureCore
  };
}

function recordSuccess(command, workspaceDir = process.cwd(), resolutionNotes = '') {
  const filePath = getScratchpadPath(workspaceDir);
  const existing = readScratchpad(workspaceDir);

  if (!existing || !existing.includes('### ✖ Attempt #')) {
    // No prior failures recorded, nothing to resolve
    return { resolved: false };
  }

  const now = new Date().toISOString();
  const resolutionHeader = [
    '# 🧠 TASK RESOLVED: MECHANICAL EXIT CODE 0 VERIFIED',
    `> **Resolved At:** ${now}`,
    `> **Successful Command:** \`${command}\``,
    resolutionNotes ? `> **Verified Fix:** ${resolutionNotes}` : '',
    '',
    '## 📜 Historical Investigation Log (Resolved)',
    existing.replace('# 🧠 ACTIVE TASK HYPOTHESIS & SCRATCHPAD LEDGER', '')
  ].join('\n');

  try {
    fs.writeFileSync(filePath, resolutionHeader, 'utf8');
  } catch {}

  return {
    resolved: true,
    filePath
  };
}

// CLI Execution
if (require.main === module) {
  const [,, cmd, arg1, arg2] = process.argv;

  switch (cmd) {
    case 'record-fail': {
      const res = recordFailure(arg1 || 'unknown command', arg2 || 'error');
      console.log(`[SCRATCHPAD] Logged Attempt #${res.attemptNumber}: ${res.failureCore}`);
      break;
    }
    case 'record-success': {
      const res = recordSuccess(arg1 || 'command', process.cwd(), arg2 || '');
      console.log(`[SCRATCHPAD] Status: ${res.resolved ? 'RESOLVED' : 'CLEAN'}`);
      break;
    }
    case 'read': {
      const content = readScratchpad();
      console.log(content || '[SCRATCHPAD] Clean (No active failure records)');
      break;
    }
    case 'clear': {
      clearScratchpad();
      console.log('[SCRATCHPAD] Cleared.');
      break;
    }
    default: {
      console.log('Usage: node scratchpad-ledger.js <record-fail|record-success|read|clear>');
      process.exit(0);
    }
  }
}

module.exports = {
  getScratchpadPath,
  readScratchpad,
  clearScratchpad,
  extractFailureCore,
  recordFailure,
  recordSuccess
};
