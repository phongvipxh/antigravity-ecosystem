---
name: dynamic-harness-runner
description: >-
  Author and execute task-specific ephemeral test harnesses on-the-fly, inspired by
  Claude Code dynamic workflows and OpenAI Codex Core execution plane. Use when running
  complex multi-model benchmarks, parallel candidate tournaments, deep repository sweeps,
  or bounded test-time trajectory searches.
---

# Agent Skill: Dynamic Harness Runner (Ephemeral Execution Engine)

## 1. Overview & Core Philosophy
The `dynamic-harness-runner` skill enables the agent to dynamically synthesize ad-hoc, isolated execution environments on-the-fly ("Harness On-The-Fly"). Instead of executing dozens of fragile, interactive command steps in the main conversation window, the agent constructs a self-contained runner script inside `scratch/`, executes it within a bounded process, collects structured JSON telemetry, and tears down ephemeral artifacts cleanly.

## 2. When to Use
- **Multi-Candidate Verification Tournaments:** Evaluating 2-3 speculative code fixes (Best-of-N) in parallel against a test suite.
- **Deep Repository Sweeps:** Running full-codebase typechecks, lint passes, or secret scans without flooding context with raw terminal logs.
- **Automated Intelligence Benchmarks:** Conducting head-to-head model shootouts under controlled token and runtime constraints.
- **Stress & Concurrency Probing:** Simulating race conditions, distributed locks, or memory leak profiling.

## 3. Ephemeral Harness Protocol (Step-by-Step)

### Step 1: Synthesize the Runner Script
Generate a self-contained Node.js or Python script in `<artifactDir>/scratch/harness-<task-name>.js`.
The harness must include:
1. **Isolated Working Directory:** Uses designated sandbox paths (`benchmark/<candidate-id>/`).
2. **Timeout & Concurrency Caps:** Wraps executions with strict `AbortSignal.timeout(ms)` or process timeouts.
3. **Structured Telemetry Output:** Captures duration, exit codes, memory usage, and assertion metrics as a single JSON payload.

Example Structure:
```javascript
// scratch/harness-tournament.js
const { execSync } = require('child_process');
const fs = require('fs');

const candidates = ['candidate-a', 'candidate-b'];
const results = {};

for (const c of candidates) {
  const start = Date.now();
  try {
    const stdout = execSync(`node --test ./candidates/${c}/test.js`, { timeout: 10000 }).toString();
    results[c] = { pass: true, durationMs: Date.now() - start, stdout: stdout.slice(-200) };
  } catch (err) {
    results[c] = { pass: false, durationMs: Date.now() - start, error: err.message.slice(0, 200) };
  }
}

console.log(JSON.stringify(results, null, 2));
```

### Step 2: Execute in a Bounded Turn
Run the script using `run_command` with sufficient `WaitMsBeforeAsync` to allow synchronous completion, or inspect via `manage_task`.

### Step 3: Extract & Prune
Parse the returned JSON telemetry.
- **Noise Pruning:** Never print thousands of raw lines. Present a high-signal comparative Markdown table.
- **Winning Path Selection:** Automatically adopt the patch with 100% test pass rate and lowest latency.
- **Teardown:** Clean up scratch artifacts or preserve only the winning implementation in the project root.

## 4. Sub-Agent Concurrency Guard
When delegating harness tasks to subagents:
- Enforce **Maximum 3 concurrent subagents**.
- Enforce **Maximum recursion depth of 2**.
- If a subagent exceeds its timeout or loops indefinitely, cancel it immediately via `manage_subagents` with action `kill`.

## 5. Pre-Flight Checklist
- [ ] Runner script is located in `scratch/` and does not pollute project source trees.
- [ ] Hard timeout is explicitly specified (prevents hung processes).
- [ ] Output is structured JSON or compact exit status (prevents context truncation).
- [ ] Winning trajectory is verified with mechanical exit code 0 before merging.
