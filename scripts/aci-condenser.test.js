const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  stripAnsi,
  cleanControlChars,
  isProgressNoise,
  extractSummary,
  extractFailureDiagnostics,
  condenseOutput,
  runCondensed,
  HeadTailCollector,
  formatCommandArg
} = require('./aci-condenser.js');

describe('ACI Terminal Condenser Suite', () => {
  test('stripAnsi removes ANSI escape codes and colors', () => {
    const colored = '\u001B[31mError:\u001B[39m \u001B[1mFailed\u001B[22m';
    const plain = stripAnsi(colored);
    assert.equal(plain, 'Error: Failed');
  });

  test('cleanControlChars normalizes carriage returns', () => {
    const raw = 'Downloading...\rDownloaded 100%\r\nDone';
    const cleaned = cleanControlChars(raw);
    assert.equal(cleaned, 'Downloading...\nDownloaded 100%\nDone');
  });

  test('isProgressNoise detects progress bars and spinners', () => {
    assert.equal(isProgressNoise('[====>    ] 45%'), true);
    assert.equal(isProgressNoise('⠋ Loading dependencies...'), true);
    assert.equal(isProgressNoise('Regular log line'), false);
  });

  test('extractSummary captures test and build summary lines', () => {
    const lines = [
      'Compiling src/index.ts',
      'Linting files...',
      '# tests 24',
      '# suites 3',
      '# pass 24',
      '# fail 0',
      'Done in 1.45s'
    ];
    const summary = extractSummary(lines);
    assert.ok(summary.length >= 4);
    assert.ok(summary.some((line) => line.includes('# pass 24')));
  });

  test('extractFailureDiagnostics captures stack traces and assertions', () => {
    const lines = [
      'info: running tests',
      'AssertionError [ERR_ASSERTION]: Expected true but got false',
      '    at TestContext.<anonymous> (test/math.test.js:14:12)',
      '    at Test.run (node:internal/test_runner/test:892:25)',
      '# fail 1'
    ];
    const diags = extractFailureDiagnostics(lines);
    assert.ok(diags.some((d) => d.includes('AssertionError')));
    assert.ok(diags.some((d) => d.includes('test/math.test.js')));
  });

  test('condenseOutput retains short output verbatim on success', () => {
    const shortOut = 'All 5 tests passed.\nDone in 0.2s';
    const res = condenseOutput(shortOut, 0, 'npm test', 200);
    assert.equal(res, shortOut);
  });

  test('condenseOutput condenses long output on success', () => {
    const longLines = Array.from({ length: 40 }, (_, i) => `Step ${i + 1} finished successfully`);
    longLines.push('# tests 40 passed');
    const res = condenseOutput(longLines.join('\n'), 0, 'npm test', 1200);
    assert.ok(res.includes('[ACI: SUCCESS]'));
    assert.ok(res.includes('tests 40 passed'));
  });

  test('runCondensed executes a command and preserves exit code', async () => {
    const { exitCode, condensedOutput } = await runCondensed(['node', '-e', '"console.log(\'hello aci\')"']);
    assert.equal(exitCode, 0);
    assert.ok(condensedOutput.includes('hello aci'));
  });

  test('HeadTailCollector preserves head and tail without dropping final diagnostics under heavy volume', () => {
    // 500 byte limit for test: 100 bytes head, 150 bytes tail
    const collector = new HeadTailCollector(500, 100, 150);
    collector.append('START_CONFIG_OPTIONS_LOADED: mode=production\n');
    for (let i = 0; i < 50; i++) {
      collector.append(`intermediate verbose compilation log line ${i}\n`);
    }
    collector.append('FINAL_TEST_SUMMARY: 100 tests passed, 0 failures\n');

    const result = collector.toString();
    assert.ok(result.includes('START_CONFIG_OPTIONS_LOADED'));
    assert.ok(result.includes('FINAL_TEST_SUMMARY: 100 tests passed, 0 failures'));
    assert.ok(result.includes('Middle output stream collapsed'));
  });

  test('formatCommandArg wraps arguments with spaces in quotes without double quoting', () => {
    assert.equal(formatCommandArg('npm'), 'npm');
    assert.equal(formatCommandArg('run test'), '"run test"');
    assert.equal(formatCommandArg('"already quoted"'), '"already quoted"');
    assert.equal(formatCommandArg("'single quoted'"), "'single quoted'");
    assert.equal(formatCommandArg('-m Commit message with spaces'), '"-m Commit message with spaces"');
  });
});
