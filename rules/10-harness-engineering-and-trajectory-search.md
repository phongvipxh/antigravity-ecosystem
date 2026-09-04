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

## 9. ACI Terminal Output Condensation & Full Failure Fidelity
- Raw terminal streams pollute the attention window with ANSI escape sequences, spinner rewrites, and hundreds of repetitive build lines.
- Wrap execution commands with `scripts/aci-condenser.js`:
  - **Success (`exit 0`):** Automatically collapse verbose passes into high-signal telemetry and summary metrics (hiding mundane build and download noise).
  - **Failure (`exit != 0`):** Preserve 100% full diagnostic fidelity (Rule 04 Compliance). Deliver the complete, unadulterated failure output—including all assertion diffs, compiler notes, and visual carets—without arbitrary line cuts or token-saving truncations. Only guard against abnormal infinite-loop stream floods.

## 10. Ephemeral Micro-Checkpointing & Atomic Rollback
- Never perform risky multi-file refactors without an atomic recovery anchor.
- Utilize `scripts/git-checkpoint.js`:
  - **Pre-Mutation Anchor:** Snapshot the working tree into an isolated git ref (`refs/checkpoints/<timestamp>_<label>`) before touching code.
  - **Atomic Rollback:** If speculative implementations or multi-file edits fail to converge to Exit Code 0, rollback atomically in 1 step without leaving messy intermediate artifacts.

## 11. Dual-Agent Adversarial Verification Gate (Anthropic Managed Agents Pattern)
- Eliminate author confirmation bias by separating the Executor from the Auditor:
  - The author agent must never be the sole judge of its own edge cases.
  - For concurrent, security-critical, or high-blast-radius subsystems, invoke the `dual-agent-auditor` skill:
  - The Auditor receives ONLY the git diff and requirements under a strict information barrier, synthesizing adversarial fuzz tests to stress test the implementation before production certification.

## 12. Anti-Loop Circuit Breaker & Stuck State Guard
- LLMs cannot reliably self-diagnose repetitive action loops or token-burning deadlock.
- `scripts/loop-breaker.js` monitors consecutive command invocations and failure output similarity:
  - **Threshold:** Maximum 3 consecutive failures or >80% output similarity immediately trips the circuit breaker.
  - **Advisor Intervention:** Injects an out-of-band diagnostic hint directly into the execution stream.
  - **Mandatory Halt:** Prevents repeating the same failing trajectory without formulating a new hypothesis.

## 13. Persistent Hypothesis Ledger (Scratchpad Memory Buffer)
- Eliminates the "Groundhog Day" failure pattern during iterative debugging.
- `scripts/scratchpad-ledger.js` automatically tracks invalid paths in `.agents/scratchpad.md`:
  - Logs failure signatures, attempted patches, and eliminated hypotheses.
  - Strictly prohibits the agent from re-attempting identical broken trajectories.
  - Automatically verifies and archives resolution upon achieving mechanical Exit Code 0.

## 14. Cross-Session Reflection Ledger & Experience Memory
- Implements Reflexion-style cross-session learning via `scripts/lessons-ledger.js`:
  - **Automated Lesson Recall:** On test failure, query previous verified solutions across all projects and inject relevant fixes.
  - **Automated Lesson Distillation:** On achieving mechanical Exit Code 0 after debugging failures, automatically distill the verified resolution into persistent experience memory (`lessons.jsonl`).

## 15. Adaptive Test-Time Compute (TTC) Allocation
- Compute budget is dynamically calibrated via `scripts/ttc-profiler.js` across 5 Complexity Tiers:
  - **Tier 1 (Fast Path):** Typos, formatting, docs -> 0 subagents, max 2 turns, direct surgical edit.
  - **Tier 2 (Single-Component):** Helper logic, unit tests -> 0 subagents, max 4 turns, TDD cycle.
  - **Tier 3 (Multi-File Integration):** Features, API endpoints -> max 1 subagent, max 8 turns, Scratchpad Ledger active.
  - **Tier 4 (Architectural Refactor):** Migrations, breaking changes -> max 2 subagents, max 15 turns, Git Micro-Checkpoints + Dual-Agent Audit.
  - **Tier 5 (Concurrency & Benchmark):** Race conditions, distributed state -> max 3 subagents, max 25 turns, Dynamic Ephemeral Harness + Best-of-N Trajectory Search.

## 16. Self-Evolving Skill Engine & Mechanical Gatekeeper (OpenSpace Integration)
- **Warm-Skill Pre-Flight Check:** Before building complex multi-step architectures or algorithmic modules from scratch, query `search_skills` via OpenSpace MCP to retrieve proven, high-quality skill implementations, reducing token overhead by up to 46%.
- **Strict Mechanical Admission Gate:** A skill is ONLY eligible for registration or `upload_skill` into the persistent OpenSpace registry if it satisfies 3 deterministic criteria:
  1. Mechanical Exit Code 0 test pass across all edge cases.
  2. Zero-placeholder compliance (`scanPlaceholders == clean`).
  3. Zero hardcoded absolute local paths or environment-leaking secrets.
- **Autonomous Skill Repair (`fix_skill`):** When an existing skill fails during real-world execution, pass the complete mechanical failure trace into `fix_skill` to trigger focused evolutionary repair without polluting context.




