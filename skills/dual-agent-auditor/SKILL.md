---
name: dual-agent-auditor
description: >-
  Adversarial dual-agent verification and code auditing loop to eliminate self-grading bias.
  Spawns an independent auditor subagent armed only with git diffs and requirements to probe
  edge cases, race conditions, and write adversarial fuzz tests before final sign-off.
---

# Agent Skill: Dual-Agent Adversarial Auditor

## 1. Overview & Core Philosophy
The `dual-agent-auditor` skill operationalizes the **Planner-Generator-Evaluator** architecture popularized in 2025–2026 by Anthropic Claude Managed Agents and OpenAI Codex Core.

### The Problem: Self-Grading Confirmation Bias
When a single AI agent both implements code and authors the validation tests, it suffers from severe *Self-Grading Bias*. The author agent unconsciously designs unit tests that mirror its own algorithmic assumptions, ignoring blind spots, race conditions, and unhandled edge cases.

### The Solution: Adversarial Separation of Concerns
The `dual-agent-auditor` introduces an independent, isolated **Auditor Subagent** whose sole incentive is to find flaws, break assumptions, and author adversarial tests that challenge the implementation.

```
       +--------------------+
       |   User Request     |
       +---------+----------+
                 |
                 v
       +--------------------+
       |   Executor Agent   | ---> Implements feature + basic tests
       +---------+----------+
                 |
                 | (Transfers ONLY: Git Diff + Original Requirements)
                 v
       +--------------------+
       |  Adversarial Agent | ---> Analyzes diff without author bias
       |     (Auditor)      | ---> Synthesizes stress & fuzz test suite
       +---------+----------+
                 |
        [Passes Fuzz Tests?]
        /                  \
      YES                   NO
       |                     |
  [Exit Code 0]      [Returns Failing Test]
       |                     |
[Final Approval]     [Executor Remediates]
```

---

## 2. The Strict Information Barrier
To prevent confirmation bias contagion, the Auditor Subagent must be invoked under a **Strict Information Barrier**:
1. **Allowed Inputs:**
   - The original specification/requirements.
   - The git diff (`git diff`) showing only the modified lines.
2. **Banned Inputs:**
   - The Executor's self-congratulatory rationalizations or conversational commentary.
   - "Soft" verbal assurances that edge cases are handled.

---

## 3. When to Trigger the Dual-Agent Auditor
Trigger this skill autonomously for:
- **Concurrent & Asynchronous Logic:** Circuit breakers, task queues, mutexes, thundering-herd mitigations.
- **Security & Financial Logic:** Token validators, payment pipelines, permission gates, sanitizers.
- **High-Blast-Radius Refactors:** Database schema migrations, core routing, or multi-file architectural shifts.

---

## 4. Operational Protocol (Step-by-Step)

### Step 1: Pre-Audit Checkpoint
Always anchor state with `git-checkpoint.js` before running adversarial suites:
```bash
node scripts/git-checkpoint.js create "pre-audit"
```

### Step 2: Extract Clean Diff
Capture the surgical diff of the implementation:
```bash
git diff HEAD > scratch/audit-diff.patch
```

### Step 3: Spawn the Auditor Subagent
Invoke an independent subagent via `invoke_subagent`:
```json
{
  "TypeName": "self",
  "Role": "Adversarial Code Auditor",
  "Model": "flash",
  "Prompt": "You are an Adversarial Code Auditor. Your sole mission is to find edge cases, race conditions, memory leaks, and breaking inputs in this patch:\n\n[REQUIREMENTS]\n<Original requirements here>\n\n[GIT DIFF]\n<Diff patch here>\n\nWrite a dedicated adversarial stress/fuzz test in scratch/adversarial.test.js. Run it using node aci-condenser.js -- node --test scratch/adversarial.test.js. If you can break the code, report the exact failure and reproduction script. If the implementation is bulletproof, report certification."
}
```

### Step 4: Auditor Attack Vectors
The Auditor systematically tests 5 attack dimensions:
1. **Concurrency & Timing:** Fast-firing parallel promises, out-of-order resolution, event loop starvation.
2. **Boundary Values:** Empty strings, null, undefined, `NaN`, negative numbers, max integer bounds (`Number.MAX_SAFE_INTEGER`).
3. **Resource Leaks:** Dangling event listeners, unclosed streams, timer leaks.
4. **Error Handling:** Async rejections, thrown non-Error objects (`throw "string"`), network timeouts.
5. **Security/Injection:** Prototype pollution (`__proto__`), unescaped template literals, path traversal.

### Step 5: Reconciliation & Verification Gate
- **If Auditor Breaks Code:** The test failure is mechanical proof. The Executor agent is presented with the failing test and must remediate the root cause (Rule 03).
- **If Auditor Certifies Code:** The patch has passed both constructive and adversarial testing, guaranteeing production-grade resilience.
- **Teardown:** Prune ephemeral test files in `scratch/` and commit clean code.
