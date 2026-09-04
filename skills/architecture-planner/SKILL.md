---
name: architecture-planner
description: >-
  Architectural planning, requirement decomposition, and risk management protocol.
  Use this skill when designing new multi-file features, executing large migrations,
  refactoring core subsystems, or planning multi-step technical initiatives to guarantee
  clear boundaries, minimal scope creep, and verifiable execution checkpoints.
---

# Architecture Planning & Requirement Decomposition

This skill provides a battle-tested protocol (inspired by Roo-Code Architect Mode and Cursor Plan Mode) for engineering large-scale modifications with zero ambiguity and maximum precision.

## Step 1: Requirements Disambiguation & Contract Freezing

1. **Classify Requirements**:
   - **Hard Invariants (Facts)**: Stated business rules, framework boundaries, protocol specifications.
   - **Architectural Assumptions**: Inferred designs, default configuration strategies, data schemas.
2. **Resolve Ambiguity Early**:
   - If multiple architectural options exist with different tradeoffs, present 2–3 concise alternatives with pros/cons before writing implementation code.
3. **Explicit Scope Boundaries**:
   - Define **In-Scope** (what will be built now) vs **Out-of-Scope** (what is explicitly deferred to prevent scope creep).

## Step 2: Dependency & Module Ordering

1. **Topological Ordering (Dependency-First)**:
   - Order changes such that foundational schemas, interfaces, and utilities are implemented and tested *before* consumer modules or UI layers:
     `Types/Schemas` -> `Core Business Logic/Services` -> `Adapters/APIs` -> `UI/CLI Consumers`.
2. **Blast Radius Analysis**:
   - Identify every existing caller and consumer that will be affected by signature changes.
   - Plan backward-compatible transition bridges where applicable.

## Step 3: Atomic Execution Phases with Verification Gates

Break complex tasks into small, self-contained milestones:

| Phase | Deliverable | Verification Checkpoint |
| :--- | :--- | :--- |
| **Phase 1: Interfaces & Contracts** | Type definitions, models, or DB migrations | Linter passes, compiler/typecheck validates |
| **Phase 2: Core Logic** | Internal service / logic implementation | Unit tests pass with edge-case coverage |
| **Phase 3: Integration** | Connecting callers, endpoints, or UI | End-to-end or integration tests pass |
| **Phase 4: Cleanup & Regression** | Deprecate old code, final sweeps | Full project build & regression suite clean |

## Step 4: Rollback & Failure Mitigation

- Document the exact rollback mechanism (e.g., git revert boundary, DB rollback script) in case unexpected breaking changes emerge mid-implementation.
