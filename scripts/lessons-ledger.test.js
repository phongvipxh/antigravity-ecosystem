const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  tokenize,
  calculateTokenOverlap,
  recordLesson,
  queryLessons,
  formatLessonAdvice,
  distillFromScratchpad,
  getLocalLedgerPath
} = require('./lessons-ledger');

describe('Cross-Session Reflection Ledger Suite', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'antigravity-lessons-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('tokenize extracts meaningful alphanumeric tokens', () => {
    const tokens = tokenize('ReferenceError: require is not defined in ES module scope');
    assert.ok(tokens.has('referenceerror'));
    assert.ok(tokens.has('require'));
    assert.ok(tokens.has('defined'));
    assert.ok(tokens.has('module'));
    assert.ok(tokens.has('scope'));
    assert.ok(!tokens.has('is')); // <= 2 chars filtered
  });

  it('calculateTokenOverlap computes correct overlap ratio', () => {
    const setA = new Set(['port', 'already', 'use', 'eaddrinuse']);
    const setB = new Set(['error', 'listen', 'eaddrinuse', 'port', 'already']);
    const overlap = calculateTokenOverlap(setA, setB);
    assert.ok(overlap >= 0.75, `Expected overlap >= 0.75, got ${overlap}`);
  });

  it('recordLesson records a new lesson and updates occurrences on duplicate', () => {
    const lesson1 = recordLesson(
      {
        trigger_pattern: 'Error: listen EADDRINUSE: address already in use :::3000',
        root_cause: 'Port 3000 is still held by a zombie dev server process',
        verified_solution: 'Kill process using Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process',
        tags: ['networking', 'ports', 'eaddrinuse']
      },
      { workspaceDir: tempDir, localOnly: true }
    );

    assert.ok(lesson1.id.startsWith('lesson_'));
    assert.strictEqual(lesson1.occurrences, 1);

    const localLedgerFile = getLocalLedgerPath(tempDir);
    assert.ok(fs.existsSync(localLedgerFile));

    // Record similar lesson with minor variation
    const lesson2 = recordLesson(
      {
        trigger_pattern: 'Error: listen EADDRINUSE: address already in use :::3000',
        root_cause: 'Port 3000 occupied',
        verified_solution: 'Kill process on port 3000 or pick another port',
        tags: ['zombie-process']
      },
      { workspaceDir: tempDir, localOnly: true }
    );

    assert.strictEqual(lesson2.id, lesson1.id);
    assert.strictEqual(lesson2.occurrences, 2);
    assert.ok(lesson2.tags.includes('zombie-process'));
    assert.ok(lesson2.tags.includes('networking'));
  });

  it('queryLessons ranks and retrieves relevant past solutions by error symptom', () => {
    recordLesson(
      {
        trigger_pattern: 'TypeError: Cannot read properties of undefined (reading map)',
        root_cause: 'State initialized as null or fetch promise returned undefined array',
        verified_solution: 'Use optional chaining and default array: (items || []).map(...)',
        tags: ['javascript', 'typeerror', 'react']
      },
      { workspaceDir: tempDir, localOnly: true }
    );

    recordLesson(
      {
        trigger_pattern: 'SyntaxError: Unexpected token export',
        root_cause: 'Node running CommonJS mode without type: module in package.json',
        verified_solution: 'Add "type": "module" to package.json or use .mjs extension',
        tags: ['nodejs', 'esm', 'syntaxerror']
      },
      { workspaceDir: tempDir, localOnly: true }
    );

    const results = queryLessons('Uncaught TypeError: Cannot read properties of undefined (reading map) at Component.render', {
      workspaceDir: tempDir
    });

    assert.ok(results.length >= 1);
    assert.strictEqual(results[0].trigger_pattern, 'TypeError: Cannot read properties of undefined (reading map)');
    assert.ok(results[0].verified_solution.includes('optional chaining'));

    const advice = formatLessonAdvice(results);
    assert.ok(advice.includes('💡 [HARNESS MEMORY: RECALLED LESSON'));
    assert.ok(advice.includes('optional chaining'));
  });

  it('distillFromScratchpad distills active scratchpad failures into a permanent lesson', () => {
    const agentsDir = path.join(tempDir, '.agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    const scratchpadContent = [
      '# 🧠 ACTIVE TASK HYPOTHESIS & SCRATCHPAD LEDGER',
      '### ✖ Attempt #1 [2026-09-04T00:00:00.000Z]',
      '- **Command:** `npm test`',
      '- **Failure Signature:** `AssertionError [ERR_ASSERTION]: Expected 401 to equal 200`',
      '- **Guideline:** Do not repeat this patch.',
      '---'
    ].join('\n');
    fs.writeFileSync(path.join(agentsDir, 'scratchpad.md'), scratchpadContent, 'utf8');

    const distilled = distillFromScratchpad(tempDir, 'Added missing Bearer authorization token header to request mock.');
    assert.ok(distilled);
    assert.ok(distilled.trigger_pattern.includes('Expected 401 to equal 200'));
    assert.ok(distilled.verified_solution.includes('Bearer authorization token'));

    const localLedger = getLocalLedgerPath(tempDir);
    assert.ok(fs.existsSync(localLedger));

    // Calling distill a second time on the same scratchpad returns null (idempotent)
    const secondDistill = distillFromScratchpad(tempDir);
    assert.strictEqual(secondDistill, null);
  });

  it('distillFromScratchpad returns null if scratchpad has not resolved yet', () => {
    const agentsDir = path.join(tempDir, '.agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    const failingContent = [
      '# 🧠 ACTIVE TASK HYPOTHESIS & SCRATCHPAD LEDGER',
      '### ✖ Attempt #1 [2026-09-04T00:00:00.000Z]',
      '- **Command:** `npm test`',
      '- **Failure Signature:** `TypeError: crash`',
      '---'
    ].join('\n');
    fs.writeFileSync(path.join(agentsDir, 'scratchpad.md'), failingContent, 'utf8');

    // Without explicit verifiedSolution or TASK RESOLVED header, it should NOT distill
    const distilled = distillFromScratchpad(tempDir);
    assert.strictEqual(distilled, null);
  });
});
