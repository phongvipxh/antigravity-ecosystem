---
name: test-driven-development
description: >-
  Standardized Test-Driven Development (TDD) workflow for precision coding and regression prevention.
  Use this skill when implementing new business logic, fixing bugs with regression tests,
  or refactoring high-stakes modules where 100% functional correctness is mandatory.
---

# Test-Driven Development (TDD) & Regression Prevention

This skill provides a rigorous TDD framework adapted from Aider, Roo-Code, and modern agentic pair-programming best practices.

## The Agentic Red-Green-Refactor Loop

```text
1. RED: Write minimal failing test matching expected user behavior
   └── Run test suite -> Confirm test FAILS with expected error
         │
2. GREEN: Implement minimal viable code to satisfy the test
   └── Run test suite -> Confirm test PASSES cleanly
         │
3. REFACTOR: Clean up implementation, optimize, eliminate duplication
   └── Run test suite -> Confirm test STAYS GREEN without regressions
```

## Step 1: Formulate the Behavioral Contract (RED)

1. **Focus on Behavior, Not Implementation**:
   - The test should describe what the system does from the caller's perspective, not how internal private variables change.
2. **Write Minimal Isolated Test**:
   - Add a test in the project's native test framework (`jest`, `vitest`, `pytest`, `cargo test`, `go test`).
   - Run the test command and verify it fails with the exact expected failure condition (not due to syntax error or import failure).

## Step 2: Minimal Viable Code (GREEN)

1. **Simplest Code First**:
   - Write only enough code to make the failing test pass.
   - Resist the urge to write extra methods, preemptive optimizations, or unrequested features.
2. **Run the Test Suite**:
   - Run the specific test and observe green status.

## Step 3: Refactor & Harden (REFACTOR)

1. **Clean Code Standards**:
   - Remove duplicate code, ensure clean naming, extract helpers if readability improves.
2. **Boundary Testing**:
   - Add test cases for critical boundaries:
     - Null / undefined / None inputs
     - Empty arrays, strings, or maps
     - Off-by-one indices, negative numbers
     - Asynchronous timeouts or network error states
3. **Full Regression Gate**:
   - Run the full project test suite to verify no other components broke.
