---
name: deep-codebase-researcher
description: >-
  Exhaustive, deep-dive codebase exploration and architectural mapping protocol.
  Use this skill when exploring unfamiliar repositories, diagnosing complex multi-file bugs,
  tracing full call graphs, mapping complete data flows, or preparing large-scale architectural refactors.
  Prioritizes 100% comprehension and deep research over token economy.
---

# Deep Codebase Researcher & Architectural Cartographer

This skill equips the agent with an uncompromising, exhaustive research methodology to achieve 100% mastery over complex codebases.

## Core Principle: Comprehension Supersedes Token Economy
Token conservation is strictly the lowest priority. When investigating a codebase, you must never guess, never cut corners, and never refrain from reading full files, type definitions, or caller hierarchies.

## Phase 1: Structural & Boundary Reconnaissance
1. **Entrypoint & Architecture Identification**:
   - Locate the system entrypoints (`index.ts`, `server.ts`, `main.py`, `main.go`, `App.tsx`).
   - Read the manifest files (`package.json`, `Cargo.toml`, `requirements.txt`, `go.mod`) to understand third-party foundations and exact runtime versions.
2. **Directory & Module Topology**:
   - Map out directory responsibilities and architectural layers (e.g. Presentation -> Application -> Domain -> Infrastructure).

## Phase 2: Exhaustive Call-Graph & Data-Flow Tracing
1. **End-to-End Flow Mapping**:
   - Trace the entire execution path from the external trigger (HTTP request, CLI command, event listener) through all middleware, controllers, services, repositories, and database schemas.
2. **Read Full Context (No Artificially Constrained Reading)**:
   - Read complete source files to understand the full lifecycle, component state, imports, and helper methods.
   - Inspect interface declarations, types, schemas, and ORM models completely to understand data contracts and constraints.
3. **Cross-Referencing All Callers**:
   - Search for every usage site of the function/module across the codebase.
   - Assess ripple effects: ensure modifying a signature or behavior will not break unexpected consumers or edge cases.

## Phase 3: Synthesizing the Architectural Mental Model
1. **Identify Hard Invariants**:
   - What invariants (thread-safety, transaction boundaries, authentication rules, idempotency) must never be broken?
2. **Map Edge Cases & Error Boundaries**:
   - Identify how failures are handled, logged, and propagated across boundaries.
3. **Formulate High-Confidence Implementation Strategy**:
   - Only conclude research when you have complete, verifiable clarity on how the entire system operates and interacts.
