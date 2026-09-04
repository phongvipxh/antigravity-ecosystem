#!/usr/bin/env node
/**
 * Cross-Session Reflection Ledger Engine (lessons.jsonl)
 * Part of Antigravity Ecosystem Harness Engineering (2026)
 *
 * Implements Reflexion & Cross-Session Memory:
 * - Distills verified solutions from resolved debugging loops into persistent experience memory.
 * - Maintains both global (~/.gemini/config/lessons.jsonl) and project-local (.agents/lessons.jsonl) stores.
 * - Enables automated recall: When an error signature occurs, instantly surfaces prior verified fixes.
 * - Auto-distills lessons when scratchpad resolves after non-zero exit codes.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOME = process.env.USERPROFILE || process.env.HOME || '';
const GLOBAL_CONFIG_DIR = path.join(HOME, '.gemini', 'config');
const GLOBAL_LESSONS_PATH = path.join(GLOBAL_CONFIG_DIR, 'lessons.jsonl');

function getGlobalLedgerPath() {
  return GLOBAL_LESSONS_PATH;
}

function getLocalLedgerPath(workspaceDir = process.cwd()) {
  const agentsDir = path.join(workspaceDir, '.agents');
  return path.join(agentsDir, 'lessons.jsonl');
}

function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
}

function generateLessonId(triggerPattern) {
  const hash = crypto.createHash('sha256').update(triggerPattern || String(Date.now())).digest('hex').slice(0, 8);
  return `lesson_${Date.now()}_${hash}`;
}

function tokenize(text) {
  if (!text || typeof text !== 'string') return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9_\-\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function calculateTokenOverlap(tokensA, tokensB) {
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let matchCount = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      matchCount++;
    }
  }
  return matchCount / Math.min(tokensA.size, tokensB.size);
}

function readJsonlFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function writeJsonlFile(filePath, entries) {
  ensureDirExists(filePath);
  const content = entries.map((entry) => JSON.stringify(entry)).join('\n') + (entries.length > 0 ? '\n' : '');
  fs.writeFileSync(filePath, content, 'utf8');
}

function readLessons(options = {}) {
  const { workspaceDir = process.cwd(), globalOnly = false, localOnly = false } = options;
  const lessonsMap = new Map();

  if (!localOnly) {
    const globalEntries = readJsonlFile(GLOBAL_LESSONS_PATH);
    globalEntries.forEach((entry) => {
      if (entry && entry.id) {
        lessonsMap.set(entry.id, { ...entry, scope: 'global' });
      }
    });
  }

  if (!globalOnly) {
    const localPath = getLocalLedgerPath(workspaceDir);
    const localEntries = readJsonlFile(localPath);
    localEntries.forEach((entry) => {
      if (entry && entry.id) {
        lessonsMap.set(entry.id, { ...entry, scope: 'local' });
      }
    });
  }

  return Array.from(lessonsMap.values());
}

function recordLesson(lessonData, options = {}) {
  const { workspaceDir = process.cwd(), globalOnly = false, localOnly = false } = options;

  if (!lessonData || !lessonData.trigger_pattern || !lessonData.verified_solution) {
    throw new Error('Lesson must contain at least trigger_pattern and verified_solution');
  }

  const normalizedTrigger = lessonData.trigger_pattern.trim();
  const rootCause = lessonData.root_cause || 'Identified via automated harness resolution';
  const verifiedSolution = lessonData.verified_solution;
  const triggerTokens = tokenize(normalizedTrigger);
  const now = new Date().toISOString();

  // Targets to write to
  const targets = [];
  if (!localOnly) targets.push(GLOBAL_LESSONS_PATH);
  if (!globalOnly) targets.push(getLocalLedgerPath(workspaceDir));

  let resultingLesson = null;

  for (const targetPath of targets) {
    const existing = readJsonlFile(targetPath);
    let matchedIndex = -1;

    for (let i = 0; i < existing.length; i++) {
      const entry = existing[i];
      if (entry.trigger_pattern === normalizedTrigger) {
        matchedIndex = i;
        break;
      }
      const existingTokens = tokenize(entry.trigger_pattern);
      if (calculateTokenOverlap(triggerTokens, existingTokens) > 0.85) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex >= 0) {
      const existingLesson = existing[matchedIndex];
      const mergedTags = Array.from(new Set([...(existingLesson.tags || []), ...(lessonData.tags || [])]));
      existingLesson.root_cause = rootCause;
      existingLesson.verified_solution = verifiedSolution;
      existingLesson.tags = mergedTags;
      existingLesson.occurrences = (existingLesson.occurrences || 1) + 1;
      existingLesson.updated_at = now;
      resultingLesson = existingLesson;
    } else {
      const newLesson = {
        id: lessonData.id || generateLessonId(normalizedTrigger),
        trigger_pattern: normalizedTrigger,
        root_cause: rootCause,
        verified_solution: verifiedSolution,
        timestamp: now,
        updated_at: now,
        tags: Array.isArray(lessonData.tags) ? lessonData.tags : [],
        occurrences: 1
      };
      existing.push(newLesson);
      resultingLesson = newLesson;
    }

    writeJsonlFile(targetPath, existing);
  }

  return resultingLesson;
}

function queryLessons(queryOrError, options = {}) {
  const { workspaceDir = process.cwd(), threshold = 0.25, limit = 3 } = options;
  if (!queryOrError || typeof queryOrError !== 'string') return [];

  const queryTokens = tokenize(queryOrError);
  if (queryTokens.size === 0) return [];

  const allLessons = readLessons({ workspaceDir });
  const scored = [];

  for (const lesson of allLessons) {
    const triggerTokens = tokenize(lesson.trigger_pattern);
    const rootCauseTokens = tokenize(lesson.root_cause);
    const tagTokens = new Set((lesson.tags || []).map((t) => t.toLowerCase()));

    const triggerOverlap = calculateTokenOverlap(queryTokens, triggerTokens);
    const rootCauseOverlap = calculateTokenOverlap(queryTokens, rootCauseTokens);
    let tagMatches = 0;
    for (const tag of tagTokens) {
      if (queryTokens.has(tag)) tagMatches++;
    }
    const tagScore = tagTokens.size > 0 ? tagMatches / tagTokens.size : 0;

    const totalScore = triggerOverlap * 0.6 + rootCauseOverlap * 0.25 + tagScore * 0.15;

    if (totalScore >= threshold) {
      scored.push({
        lesson,
        score: totalScore
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => ({ ...s.lesson, match_score: Math.round(s.score * 100) / 100 }));
}

function formatLessonAdvice(lessons) {
  if (!lessons || lessons.length === 0) return '';
  const lines = [
    '💡 [HARNESS MEMORY: RECALLED LESSON FROM PRIOR RESOLUTIONS]',
    'The harness detected a pattern matching previously verified solutions:'
  ];

  lessons.forEach((l, idx) => {
    lines.push(`\n#${idx + 1} Pattern: "${l.trigger_pattern}" (Confidence: ${l.match_score ? Math.round(l.match_score * 100) + '%' : 'high'})`);
    if (l.root_cause) lines.push(`- Root Cause: ${l.root_cause}`);
    lines.push(`- Verified Solution: ${l.verified_solution}`);
    if (l.tags && l.tags.length > 0) lines.push(`- Tags: [${l.tags.join(', ')}]`);
  });

  return lines.join('\n');
}

function distillFromScratchpad(workspaceDir = process.cwd(), verifiedSolution = '') {
  const agentsDir = path.join(workspaceDir, '.agents');
  const scratchpadPath = path.join(agentsDir, 'scratchpad.md');

  if (!fs.existsSync(scratchpadPath)) return null;

  let content = '';
  try {
    content = fs.readFileSync(scratchpadPath, 'utf8');
  } catch {
    return null;
  }

  // Guard 1: Only distill if the scratchpad has marked resolved or explicit verifiedSolution passed
  const isResolved = content.includes('TASK RESOLVED: MECHANICAL EXIT CODE 0 VERIFIED') || Boolean(verifiedSolution);
  if (!isResolved) return null;

  // Guard 2: Prevent re-distilling the same scratchpad resolution
  if (content.includes('**Distilled to Lessons Ledger:**')) {
    return null;
  }

  const failureMatches = content.match(/- \*\*Failure Signature:\*\* `([^`]+)`/g);
  if (!failureMatches || failureMatches.length === 0) return null;

  // Extract unique failure signatures
  const signatures = failureMatches.map((m) => m.replace('- **Failure Signature:** `', '').slice(0, -1));
  const primarySignature = signatures[signatures.length - 1]; // Most recent failure

  const commandMatches = content.match(/- \*\*Command:\*\* `([^`]+)`/g);
  const lastCommand = commandMatches && commandMatches.length > 0
    ? commandMatches[commandMatches.length - 1].replace('- **Command:** `', '').slice(0, -1)
    : '';

  const solutionText = verifiedSolution || `Resolved command '${lastCommand}' with Exit Code 0 after ${signatures.length} failed attempt(s).`;

  const lesson = recordLesson(
    {
      trigger_pattern: primarySignature,
      root_cause: `Failure observed during '${lastCommand}' execution`,
      verified_solution: solutionText,
      tags: ['auto-distilled', 'scratchpad', 'verified-fix']
    },
    { workspaceDir }
  );

  // Mark scratchpad as distilled so subsequent commands do not duplicate
  try {
    const updatedContent = content + `\n> **Distilled to Lessons Ledger:** \`${lesson.id}\`\n`;
    fs.writeFileSync(scratchpadPath, updatedContent, 'utf8');
  } catch {}

  return lesson;
}

// CLI Execution
if (require.main === module) {
  const [,, cmd, ...args] = process.argv;

  switch (cmd) {
    case 'record': {
      const [trigger, cause, solution, tagsRaw] = args;
      if (!trigger || !solution) {
        console.log('Usage: node lessons-ledger.js record <trigger> <cause> <solution> [tags_comma_separated]');
        process.exit(1);
      }
      const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()) : [];
      const lesson = recordLesson({ trigger_pattern: trigger, root_cause: cause, verified_solution: solution, tags });
      console.log(`[LESSONS] Recorded lesson ${lesson.id}: "${lesson.trigger_pattern}"`);
      break;
    }
    case 'query': {
      const queryStr = args.join(' ');
      if (!queryStr) {
        console.log('Usage: node lessons-ledger.js query <error message or query>');
        process.exit(1);
      }
      const results = queryLessons(queryStr);
      if (results.length === 0) {
        console.log('[LESSONS] No matching prior lessons found.');
      } else {
        console.log(formatLessonAdvice(results));
      }
      break;
    }
    case 'list': {
      const all = readLessons();
      console.log(`[LESSONS] Total lessons stored: ${all.length}`);
      all.forEach((l, idx) => {
        console.log(`\n[#${idx + 1}] ID: ${l.id} (${l.scope || 'stored'})`);
        console.log(`  Trigger: ${l.trigger_pattern}`);
        console.log(`  Cause:   ${l.root_cause}`);
        console.log(`  Fix:     ${l.verified_solution}`);
        console.log(`  Tags:    [${(l.tags || []).join(', ')}] | Seen: ${l.occurrences || 1} time(s)`);
      });
      break;
    }
    case 'distill': {
      const solution = args.join(' ');
      const distilled = distillFromScratchpad(process.cwd(), solution);
      if (distilled) {
        console.log(`[LESSONS] Distilled lesson from scratchpad: ${distilled.id}`);
      } else {
        console.log('[LESSONS] No active scratchpad failure signatures found to distill.');
      }
      break;
    }
    default: {
      console.log('Cross-Session Reflection Ledger Engine');
      console.log('Usage: node lessons-ledger.js <record|query|list|distill>');
      process.exit(0);
    }
  }
}

module.exports = {
  getGlobalLedgerPath,
  getLocalLedgerPath,
  tokenize,
  calculateTokenOverlap,
  readLessons,
  recordLesson,
  queryLessons,
  formatLessonAdvice,
  distillFromScratchpad
};
