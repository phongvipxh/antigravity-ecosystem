---
name: systematic-debugging
description: >-
  Expert 4-stage root-cause debugging methodology adapted from Claude Code and Roo-Code.
  Use this skill when diagnosing bugs, unexpected test failures, exceptions, runtime crashes,
  or complex performance regressions to systematically isolate and fix issues without guessing.
---

# Systematic Root-Cause Debugging

This skill defines an uncompromising, 4-phase scientific debugging framework designed to isolate the fundamental defect, prevent guesswork, eliminate regressions, and minimize token burn.

## Phase 1: Minimal Reproduction (Proof of Failure)

Never attempt to fix a defect until it can be reliably reproduced.

1. **Capture Diagnostic Evidence**:
   - Inspect the complete stack trace, error message, exit codes, and surrounding log context.
   - Note the exact environment: runtime versions, OS, active flags, and recent commits.
2. **Construct a Minimal Reproducible Artifact**:
   - Write a minimal standalone test case, harness script, or targeted curl/CLI command that reliably triggers the exact failure.
   - Run the reproduction script to confirm it **fails** as expected before any source code is modified.

## Phase 2: Hypothesize & Trace (Call Graph Analysis)

1. **Formulate Explicit Hypotheses**:
   - State 1–2 testable hypotheses regarding the mechanism of failure (e.g., *"Function X receives `undefined` when config key Y is missing during hot reload"*).
2. **Trace the Data & Control Flow**:
   - Locate the boundary where expected state diverges from actual state.
   - Use targeted slicing (`StartLine`/`EndLine`) to inspect the call stack, parameter transformations, and return types.
   - Do NOT guess or patch downstream symptoms. Trace upstream to find where invalid state originated.

## Phase 3: Surgical In-Place Fix

1. **Minimal Blast Radius**:
   - Implement the minimal necessary change to address the true root cause.
   - Do not refactor unrelated code, change formatting conventions, or introduce new abstractions while fixing a bug.
2. **Preserve Invariants**:
   - Ensure edge cases (empty collections, `null`/`None`, network timeouts, concurrent access) are properly guarded.

## Phase 4: Verification Gate (Proof of Resolution)

1. **Verify Reproduction Script**:
   - Re-run the Phase 1 reproduction script or test. It MUST now pass cleanly.
2. **Run Regression Suites**:
   - Execute the project's existing test suite (`npm test`, `pytest`, `cargo test`, `go test`) and lint checks to confirm zero unintended side-effects.
3. **Clean Up Artifacts**:
   - Remove temporary debug statements, console logs, or scratch reproduction scripts if they do not belong in the permanent test suite.
