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
  // Exact single-char spinner
  if (SPINNER_CHARS.includes(trimmed)) return true;
  // Braille spinners followed by progress message (e.g. "⠋ Loading dependencies...")
  if (/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/.test(trimmed)) return true;
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
      if (isStackLine && stackLinesCount < 100) {
        errorLines.push(line);
        stackLinesCount++;
      } else if (!isStackLine) {
        if (!trimmed.startsWith('#')) {
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

  return Array.from(new Set(errorLines));
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
    // ASYMMETRIC HANDLING: Full Diagnostic Fidelity on Failures (Rule 04 Compliance)
    // Error logs are high-value ground truth (diffs, assertion mismatches, compiler carets).
    // Under Rule 04: Token Economy is Lowest Priority. Preserve 100% of all diagnostics.
    if (totalLines <= 5000) {
      const result = [
        `[ACI: FAILURE] Command: "${command}" | Exit: ${exitCode} | Duration: ${durationMs}ms | Lines: ${totalLines}`,
        '--- FULL FAILURE DIAGNOSTICS ---',
        ...filteredLines,
        '--- END DIAGNOSTICS ---'
      ];
      return result.join('\n');
    }

    // Runaway Infinite Loop Flood Protection (abnormal stream > 5000 lines):
    // Retain generous 2000-line Head + 2000-line Tail, collapsing only the repetitive middle flood.
    const result = [
      `[ACI: FAILURE (RUNAWAY LOG DETECTED)] Command: "${command}" | Exit: ${exitCode} | Duration: ${durationMs}ms | Total Lines: ${totalLines}`,
      '--- HEAD DIAGNOSTICS (First 2000 lines) ---',
      ...filteredLines.slice(0, 2000),
      `--- [COLLAPSED ${totalLines - 4000} REPETITIVE LOG LINES (Infinite loop or flood guard)] ---`,
      '--- TAIL DIAGNOSTICS (Last 2000 lines) ---',
      ...filteredLines.slice(-2000),
      '--- END DIAGNOSTICS ---'
    ];
    return result.join('\n');
  }
}

class HeadTailCollector {
  constructor(maxTotalBytes = 15 * 1024 * 1024, headBytes = 1 * 1024 * 1024, tailBytes = 4 * 1024 * 1024) {
    this.maxTotalBytes = maxTotalBytes;
    this.headBytes = headBytes;
    this.tailBytes = tailBytes;
    this.head = '';
    this.tail = '';
    this.totalBytes = 0;
    this.isTruncated = false;
  }

  append(chunkStr) {
    this.totalBytes += chunkStr.length;
    if (this.totalBytes <= this.maxTotalBytes) {
      this.head += chunkStr;
    } else {
      if (!this.isTruncated) {
        this.isTruncated = true;
        this.tail = this.head.slice(this.headBytes);
        this.head = this.head.slice(0, this.headBytes);
      }
      this.tail += chunkStr;
      if (this.tail.length > this.tailBytes) {
        this.tail = this.tail.slice(-this.tailBytes);
      }
    }
  }

  toString() {
    if (!this.isTruncated) {
      return this.head;
    }
    return (
      this.head +
      '\n\n[ACI: ... Middle output stream collapsed; initial context and final test summary/diagnostics preserved ...]\n\n' +
      this.tail
    );
  }
}

function formatCommandArg(arg) {
  if (typeof arg !== 'string') return '';
  if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
    return arg;
  }
  if (/\s/.test(arg)) {
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return arg;
}

function runCondensed(commandArgs, options = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const commandStr = Array.isArray(commandArgs)
      ? commandArgs.map(formatCommandArg).join(' ')
      : String(commandArgs);

    const child = spawn(commandStr, {
      shell: true,
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...(options.env || {}) },
      stdio: ['inherit', 'pipe', 'pipe']
    });

    const stdoutCollector = new HeadTailCollector();
    const stderrCollector = new HeadTailCollector();

    child.stdout.on('data', (chunk) => {
      stdoutCollector.append(chunk.toString());
    });

    child.stderr.on('data', (chunk) => {
      stderrCollector.append(chunk.toString());
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      const combinedOutput = (stdoutCollector.toString() + '\n' + stderrCollector.toString()).trim();
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

      // Automated Cross-Session Reflection Ledger: Recall on Failure, Distill on Resolution
      try {
        const { queryLessons, formatLessonAdvice, distillFromScratchpad } = require('./lessons-ledger');
        if (exitCode !== 0) {
          const matchingLessons = queryLessons(combinedOutput, { workspaceDir, limit: 2 });
          if (matchingLessons.length > 0) {
            condensed += '\n\n' + formatLessonAdvice(matchingLessons);
          }
        } else {
          distillFromScratchpad(workspaceDir);
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

      try {
        const { queryLessons, formatLessonAdvice } = require('./lessons-ledger');
        const matchingLessons = queryLessons(err.message, { workspaceDir, limit: 1 });
        if (matchingLessons.length > 0) {
          condensed += '\n\n' + formatLessonAdvice(matchingLessons);
        }
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
  runCondensed,
  HeadTailCollector,
  formatCommandArg
};
