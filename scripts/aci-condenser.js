#!/usr/bin/env node
/**
 * Agent-Computer Interface (ACI) Terminal Output Condenser
 * Part of Antigravity Ecosystem Harness Engineering (2026)
 *
 * Capabilities:
 * - Strips ANSI escapes, carriage returns, and control characters.
 * - Collapses progress bar noise, spinners, and repetitive logs.
 * - On Success (exit 0): Condenses hundreds of verbose lines into high-signal telemetry and summary.
 * - On Failure (exit != 0): Isolates stacktraces, failed assertions, and key error lines.
 * - Preserves exact child exit code for Mechanical Exit Code 0 Verification.
 * - Can be used as a CLI wrapper: `node aci-condenser.js -- <command>`
 * - Can be imported as a module: `const { condenseOutput, runCondensed } = require('./aci-condenser');`
 */

const { spawn } = require('child_process');

// Regex patterns
const ANSI_REGEX = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\d<A-PR-TZcf-ntqry=><~]))/g;
const PROGRESS_BAR_REGEX = /\[[=\-#>\s]{5,}\]\s*\d+%/g;
const SPINNER_CHARS = ['|', '/', '-', '\\', '⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function stripAnsi(str) {
  if (typeof str !== 'string') return '';
  return str.replace(ANSI_REGEX, '');
}

function cleanControlChars(str) {
  if (typeof str !== 'string') return '';
  // Normalize \r\n to \n and remove standalone \r (terminal line rewrites)
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function isProgressNoise(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (PROGRESS_BAR_REGEX.test(trimmed)) return true;
  // If line starts with or is a spinner character
  if (SPINNER_CHARS.some((char) => trimmed.startsWith(char) || trimmed === char)) return true;
  // Common package manager progress lines
  if (/^(⸨[#\s]+⸩|\[\d+\/\d+\]\s+Fetch)/.test(trimmed)) return true;
  return false;
}

function extractSummary(lines) {
  const summaryCandidates = [];
  const summaryPatterns = [
    /pass/i,
    /fail/i,
    /error/i,
    /warn/i,
    /tests?:?\s*\d+/i,
    /suites?:?\s*\d+/i,
    /assert/i,
    /duration/i,
    /time:/i,
    /build/i,
    /exit code/i,
    /completed/i,
    /done in/i
  ];

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    if (summaryPatterns.some((pattern) => pattern.test(line))) {
      summaryCandidates.unshift(line);
      if (summaryCandidates.length >= 6) break;
    }
  }

  if (summaryCandidates.length === 0) {
    // Return last 3 non-empty lines
    return lines.filter((l) => l.trim().length > 0).slice(-3);
  }
  return summaryCandidates;
}

function extractFailureDiagnostics(lines) {
  const errorLines = [];
  let inStackTrace = false;
  let stackLinesCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isErrorHeader = /(?:Error|Exception|Fatal|AssertionError|FAIL|FAILED)(\s*\[[^\]]+\])?\s*:/i.test(trimmed) || /^(?:FAIL|FAILED)\b/i.test(trimmed);
    const isStackLine = /^\s+at\s+/.test(line) || /^[a-zA-Z0-9_$./\\-]+:\d+(?::\d+)?/.test(trimmed);

    if (isErrorHeader) {
      inStackTrace = true;
      stackLinesCount = 0;
      errorLines.push(trimmed);
      continue;
    }

    if (inStackTrace) {
      if (isStackLine && stackLinesCount < 8) {
        errorLines.push(line);
        stackLinesCount++;
      } else if (!isStackLine) {
        if (stackLinesCount < 8 && !trimmed.startsWith('#')) {
          errorLines.push(line);
        } else {
          inStackTrace = false;
        }
      }
    } else {
      if (/fail|error|assert|rejected|timed\s*out/i.test(trimmed)) {
        errorLines.push(trimmed);
      }
    }
  }

  const uniqueLines = Array.from(new Set(errorLines));
  if (uniqueLines.length > 25) {
    return uniqueLines.slice(0, 20).concat([`... [truncated ${uniqueLines.length - 20} lines of error log]`]);
  }
  return uniqueLines;
}

function condenseOutput(rawOutput, exitCode = 0, command = '', durationMs = 0) {
  const sanitized = cleanControlChars(stripAnsi(rawOutput));
  const rawLines = sanitized.split('\n');
  const filteredLines = rawLines.filter((line) => !isProgressNoise(line));

  const totalLines = filteredLines.length;

  if (exitCode === 0) {
    if (totalLines <= 15) {
      return sanitized.trim();
    }

    const summary = extractSummary(filteredLines);
    const result = [
      `[ACI: SUCCESS] Command: "${command}" | Exit: 0 | Duration: ${durationMs}ms | Original: ${totalLines} lines`,
      '--- SUMMARY ---',
      ...summary,
      '--- END SUMMARY ---'
    ];
    return result.join('\n');
  } else {
    const diagnostics = extractFailureDiagnostics(filteredLines);
    const summary = extractSummary(filteredLines);

    const result = [
      `[ACI: FAILURE] Command: "${command}" | Exit: ${exitCode} | Duration: ${durationMs}ms | Original: ${totalLines} lines`,
      '--- CRITICAL DIAGNOSTICS ---',
      ...(diagnostics.length > 0 ? diagnostics : filteredLines.slice(-15)),
      '--- LAST KNOWN STATE ---',
      ...summary,
      '--- END DIAGNOSTICS ---'
    ];
    return result.join('\n');
  }
}

function runCondensed(commandArgs, options = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const commandStr = commandArgs.join(' ');

    const child = spawn(commandStr, {
      shell: true,
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...(options.env || {}) },
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let stdoutBuffer = '';
    let stderrBuffer = '';

    child.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString();
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      const combinedOutput = (stdoutBuffer + '\n' + stderrBuffer).trim();
      const exitCode = code === null ? 1 : code;
      let condensed = condenseOutput(combinedOutput, exitCode, commandStr, durationMs);
      const workspaceDir = options.cwd || process.cwd();

      // Automated Anti-Loop Circuit Breaker & Stuck State Guard
      try {
        const { recordExecution } = require('./loop-breaker');
        const loopState = recordExecution(commandStr, combinedOutput, exitCode, workspaceDir);
        if (loopState && loopState.breakerTriggered && loopState.advisorHint) {
          condensed += '\n\n' + loopState.advisorHint;
        }
      } catch {}

      // Automated Hypothesis Ledger & Failure Elimination Buffer
      try {
        const { recordFailure, recordSuccess } = require('./scratchpad-ledger');
        if (exitCode !== 0) {
          recordFailure(commandStr, combinedOutput, workspaceDir);
        } else {
          recordSuccess(commandStr, workspaceDir);
        }
      } catch {}

      resolve({
        exitCode,
        durationMs,
        rawOutput: combinedOutput,
        condensedOutput: condensed
      });
    });

    child.on('error', (err) => {
      const durationMs = Date.now() - startTime;
      let condensed = `[ACI: ERROR] Spawn error for "${commandStr}": ${err.message}`;
      const workspaceDir = options.cwd || process.cwd();

      try {
        const { recordFailure } = require('./scratchpad-ledger');
        recordFailure(commandStr, err.message, workspaceDir);
      } catch {}

      resolve({
        exitCode: 1,
        durationMs,
        rawOutput: err.stack || err.message,
        condensedOutput: condensed
      });
    });
  });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const separatorIndex = args.indexOf('--');

  let commandToRun = [];
  if (separatorIndex !== -1) {
    commandToRun = args.slice(separatorIndex + 1);
  } else if (args.length > 0) {
    commandToRun = args;
  }

  if (commandToRun.length === 0) {
    console.log('Usage: node aci-condenser.js -- <command to execute>');
    console.log('Example: node aci-condenser.js -- npm test');
    process.exit(0);
  }

  runCondensed(commandToRun).then(({ exitCode, condensedOutput }) => {
    console.log(condensedOutput);
    process.exit(exitCode);
  });
}

module.exports = {
  stripAnsi,
  cleanControlChars,
  isProgressNoise,
  extractSummary,
  extractFailureDiagnostics,
  condenseOutput,
  runCondensed
};
