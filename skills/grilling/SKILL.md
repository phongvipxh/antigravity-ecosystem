---
name: grilling
description: >-
  Stress-test thinking, plans, and architectural ideas through a relentless interactive interview.
  Constructs a hierarchical design tree and queries the decision frontier in structured rounds
  while independently gathering environmental facts.
---

# Agent Skill: Grilling (Design Tree & Frontier Interview Engine)

## 1. Overview & Core Philosophy
The `grilling` skill is adapted from Matt Pocock's interactive alignment engine. Its objective is to **stress-test thinking, eliminate silent assumptions, and resolve architectural ambiguity** before any code is authored.

Instead of asking fragmented, repetitive, or trivial questions, this skill models the entire problem space as a **Hierarchical Design Tree**: every architectural choice branches into subordinate technical decisions.

```
                  [Root Problem / Idea]
                       /          \
            [Decision A]          [Decision B]
              /      \                 |
        [Sub-A1]    [Sub-A2]        [Sub-B1]
```

---

## 2. The Golden Fact vs. Decision Invariant

> **"Finding facts is your job, never the user's. The decisions are the user's."**

- **Facts (Environmental Reality):**
  - Package versions, directory layouts, configuration keys, database schemas, existing API endpoints.
  - **The Agent must NEVER ask the user for facts.** The agent must proactively read files, grep code, inspect dependencies, or dispatch a research subagent to discover facts autonomously.
- **Decisions (User Values & Architecture):**
  - Trade-offs between latency vs. consistency, choosing auth providers, UX paradigms, third-party vendor selection.
  - **These belong exclusively to the user.** The agent frames the decision, provides a strong technical recommendation, and asks the user to choose.

---

## 3. The Frontier Algorithm

The interview proceeds in **Rounds** governed by the **Decision Frontier**:
1. **The Frontier:** The set of all open decisions whose prerequisites are already settled. These are questions that can be asked *right now* without guessing answers to questions not yet heard.
2. **Batching the Frontier:** Ask the **entire frontier in one round**. Number each question and provide your recommended answer with rationale. Then wait for the user's response before advancing.
3. **Advancing the Frontier:** Each user answer settles a node on the tree, pushing the frontier outward and unblocking downstream questions. Recompute the frontier for the next round.
4. **Asynchronous Fact Finding:** When a frontier question depends on a codebase fact, dispatch a background research subagent. Do not block the entire round: only questions downstream of the unsettled fact wait; ask the remaining frontier immediately.
5. **Termination:** The session concludes when the **frontier is empty** (every branch of the design tree has been visited, leaving zero unverified assumptions). Do NOT begin coding until the user explicitly confirms a shared understanding.

---

## 4. Standard Round Format

Every round presented to the user must follow this exact markdown structure:

```markdown
### 🎯 Round <N>: Exploring the Decision Frontier

❓ **Q1** - **<Decision Title>**:
<Clear explanation of the architectural trade-off, constraints, and options A/B/C.>

➡️ **Recommended:** <Your specific recommendation with concrete technical rationale.>

---

❓ **Q2** - **<Decision Title>**:
<Explanation of the decision and options.>

➡️ **Recommended:** <Your specific recommendation with concrete technical rationale.>

---
*Please reply with your decisions (e.g. "Q1: A, Q2: Recommended") to advance the frontier.*
```

---

## 5. When to Trigger Autonomously
The agent autonomously activates this skill when:
- The user's prompt begins with or mentions: *"grill me"*, *"tra khảo ý tưởng này"*, *"stress-test this plan"*.
- The user presents an ambitious, fuzzy, or underspecified feature request that requires major architectural choices.
- Planning complex migrations, new systems, or core refactors.
