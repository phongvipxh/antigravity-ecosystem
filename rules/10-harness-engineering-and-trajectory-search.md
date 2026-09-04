# RULE 10: ADVANCED AGENT HARNESS & TRAJECTORY SEARCH

## 1. The Harness-First Principle
- The LLM is the reasoning engine ("Brain"), but the Harness is the execution environment ("Operating System").
- Research confirms agent scaffolding (the harness) drives more real-world task success than model weights alone.
- 80% of agentic success depends on execution discipline, trajectory verification, context hygiene, and safety boundaries.

## 2. Dynamic Ephemeral Harnesses ("Harness On-The-Fly")
- When facing complex tasks (benchmarks, multi-module refactors, deep codebase sweeps), NEVER pollute the main dialogue with dozens of loose commands.
- **On-The-Fly Synthesis:** Dynamically author a dedicated, bounded runner script inside `scratch/` that encapsulates the execution loop, timeout guards, and structured result collection.
- **Single-Turn Execution:** Execute the ephemeral harness in one clean step, gather structured telemetry, and tear down artifacts cleanly.

## 3. Sub-Agent Concurrency & Anti-Runaway Guard
- Enforce strict deterministic boundaries on sub-agent creation to prevent resource exhaustion and infinite recursion loops:
  - **Concurrency Ceiling:** Maximum 3 concurrent subagents executing at any time.
  - **Recursion Depth:** Maximum depth of 2 levels (Parent -> Subagent -> Worker; no deeper).
  - **Execution Timeouts:** Every subagent call must define an explicit operational deadline.

## 4. Goal-Oriented Milestone DAG (Codex-Core Standard)
- Decompose non-trivial tasks into a Directed Acyclic Graph (DAG) of verifiable milestones.
- **Mechanical Gate:** No milestone may be marked complete based on conversational intent or model self-claim alone. Every transition requires empirical proof: a deterministic script or test exiting with code 0.

## 5. Test-Time Trajectory Search (Best-of-N Rollout)
- For high-stakes problems (concurrency, distributed state, critical refactors, tricky edge-case bugs), do not rely on a single linear shot.
- **Speculative Rollout:** Spawn independent subagents or evaluate multiple distinct candidate trajectories in parallel.
- **Verification Tournament:** Run the deterministic test suite against each candidate. Automatically select the winning patch with 100% test pass rate and discard failing trajectories without polluting context.

## 6. Progressive Context Compaction & Anti-Noise
- Do not let long-running sessions degrade into "Lost in the Middle" attention decay.
- **Noise Pruning:** Automatically summarize large stdout/stderr logs into actionable conclusions; never retain thousands of raw log lines in conversation history.
- **Memory Anchoring:** Maintain `PROJECT_STATUS.md` as the living ground-truth anchor across session boundaries.

## 7. Blast-Radius & Reversibility Guard
- Classify every tool action before execution:
  - **Reversible Actions** (Read, Grep, Branch creation, Local non-destructive edits): Execute autonomously at maximum velocity.
  - **High-Blast-Radius Actions** (Hard git resets, mass file deletions, database drops, `.env` edits): Mandatory pre-mutation backup or safety stash before execution. Never execute blind destructive actions.

## 8. Autonomous Reactive Event Hooks
- **On Test Failure (`exit != 0`):** Immediately trigger systematic 4-stage root-cause debugging without waiting for user intervention.
- **On External Import/API:** Immediately trigger zero-hallucination verification against actual package version and symbol exports.
- **On Architecture Request:** Autonomously route to `archify` with appropriate visual preset (`blueprint`, `editorial`, `classic`).
- **On Pre-Commit:** Run automated secret scanning for API keys, tokens, and credentials.
