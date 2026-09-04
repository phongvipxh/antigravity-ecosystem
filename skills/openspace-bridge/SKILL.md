---
name: openspace-bridge
description: Bridge skill for HKUDS/OpenSpace Self-Evolving Skill Engine. Use to discover, evaluate, fix, and persist reusable agent skills with mandatory Mechanical Gatekeeper verification (Exit Code 0 and zero-placeholder compliance).
---

# OPENSPACE BRIDGE & MECHANICAL SKILL GATEKEEPER

## 1. Overview & Architecture

HKUDS/OpenSpace is a self-evolving skill management layer for AI agents.
While OpenSpace provides the dynamic evolution and cross-session persistence engine, this skill enforces the **Mechanical Gatekeeper Protocol** (Rule 10.9) to prevent skill poisoning, hallucinations, and code degradation.

### The Complementary Cycle:
```
[ Task Request ] ──> [ 1. Warm-Skill Search ] ──> Found? ──(Yes)──> Execute & Verify
                                 │ (No)
                                 ▼
                     [ 2. Mechanical Harness ]
                     (TDD, Exit Code 0, Zero Placeholder)
                                 │
                                 ▼
                     [ 3. Mechanical Gatekeeper ]
                     (100% Passed? No TODOs? No Secrets?)
                                 │ (Yes)
                                 ▼
                     [ 4. OpenSpace Upload / Evolve ]
```

---

## 2. Phase 1: Warm-Skill Retrieval (Token & Latency Optimization)

Before building a complex algorithmic module, cloud setup, or integration from scratch:
1. Query OpenSpace MCP:
   - Tool: `search_skills`
   - Query: Specific domain keyword (e.g. `"circuit breaker"`, `"priority queue"`, `"docker swarm"`)
2. Evaluate retrieved candidates:
   - Check `quality.effective_rate` and `completion_rate`.
   - Inspect `safety_flags` — avoid candidates with `suspicious.secrets` or outdated dependencies.
3. If a high-quality skill exists:
   - Adopt the proven pattern directly.
   - Saves up to 46% context tokens and eliminates reasoning cold-starts.

---

## 3. Phase 2: Mechanical Gatekeeper (Mandatory Admission Gate)

A skill is **STRICTLY FORBIDDEN** from being uploaded or registered into the OpenSpace registry unless it satisfies all three mechanical criteria:

1. **Mechanical Proof (Exit Code 0):**
   - Must be validated by an automated test suite (`node --test`, `pytest`, `cargo test`).
   - Every single test case must pass. Exit code MUST be 0.
2. **Zero-Placeholder Compliance (Rule 08):**
   - AST/Regex scan must contain ZERO instances of:
     - `// TODO`
     - `// ...`
     - `// rest of implementation`
     - `/* ... */`
     - Unhandled `throw new Error("Not implemented")`
3. **Hermetic & Secure:**
   - Zero hardcoded local machine paths (`C:\Users\...`, `/home/...`).
   - Zero hardcoded credentials, API keys, or tokens (Rule 05).

---

## 4. Phase 3: Autonomous Skill Evolution & Self-Repair (`fix_skill`)

When an existing skill fails during real-world execution:
1. Capture the exact failure telemetry:
   - Full compiler or assertion error output.
   - Minimum reproduction test case.
2. Invoke OpenSpace MCP:
   - Tool: `fix_skill`
   - Arguments: `skill_dir`, `direction: "<full failure log and reproduction>"`
3. Verify the fixed candidate:
   - Run the reproduction test against the candidate.
   - Only promote if the candidate achieves mechanical Exit Code 0.
