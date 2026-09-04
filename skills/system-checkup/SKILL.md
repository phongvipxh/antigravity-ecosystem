---
name: system-checkup
description: >-
  Environment audit and configuration health checkup inspired by Claude Code /checkup and /doctor.
  Audits context token budget, rule drift, dead weight, MCP servers, harness tools, and secret leaks
  with automated remediation (--fix).
---

# Agent Skill: System Checkup & Health Diagnostic

## 1. Overview & Core Philosophy
The `system-checkup` skill is directly modeled after the state-of-the-art `/checkup` (and `/doctor`) tune-up subsystem introduced in Claude Code v2.1+. 

In modern agent engineering, system decay happens across multi-turn sessions:
- Rules and instructions accumulate dead weight and bloat the prompt preamble.
- Configurations drift across multiple workspace directories (`.agents`, `~/.gemini`, `GEMINI.md`).
- Hanging checkpoints and zombie background processes degrade performance.
- Accidental credentials or tokens get committed into local configs.

The `system-checkup` skill provides a one-command comprehensive audit and automated repair engine to keep the Antigravity ecosystem tuned to production specifications.

---

## 2. The 6 Diagnostic Pillars

| Pillar | Diagnostic Scope | Threshold / Guardrail |
| :--- | :--- | :--- |
| **1. Context Budget & Dead Weight** | Scans all always-on rules and prompt preambles. | Ensures total rule tokens $< 6,000$ tokens to prevent *Lost in the Middle* attention decay. |
| **2. Rule Drift & Deduplication** | Compares SHA-256 hashes of rules across Repo, Global (`~/.gemini/config/rules/`), and IDE (`~/.agents/rules/`). | Guarantees zero divergence across all 3 tiers. |
| **3. Skills Registry & Integrity** | Verifies YAML frontmatter (`name`, `description`) and valid `SKILL.md` entrypoints for all 20 skills. | Prevents silent skill discovery failures. |
| **4. Toolchain & MCP Health** | Checks Node.js runtime, Git VCS version, and validates `mcp_config.json`. | Confirms active MCP servers (`sequential-thinking`, `context7`, `memory`, `playwright`). |
| **5. Harness Tools & Checkpoints** | Verifies `aci-condenser.js` and `git-checkpoint.js` readiness. | Audits active checkpoints and flags accumulated stale checkpoints ($> 10$). |
| **6. Secret Leak & Guardrail Scanner** | Scans AST and regex across config and rule files for API keys (`AIzaSy...`, `sk-ant-...`, `ghp_...`, Private Keys). | Zero-tolerance enforcement (Rule 05.3). |

---

## 3. Usage & Execution Protocols

### A. Run Diagnostic Audit
Execute via the ACI condenser to keep execution telemetry clean:
```bash
node scripts/aci-condenser.js -- node scripts/checkup.js
```

### B. Run Automated Tune-Up & Remediation (`--fix`)
When warnings or drift are detected, run with `--fix` to automatically:
1. Re-synchronize rules and skills across Global, Workspace, and IDE tiers.
2. Prune expired git micro-checkpoints older than 24 hours.
3. Re-validate and produce the clean health certificate.
```bash
node scripts/checkup.js --fix
```

---

## 4. Autonomous Intent Routing
The agent autonomously invokes this skill whenever the user asks to:
- "chạy checkup" / "kiểm tra sức khỏe hệ thống" / "khám bệnh cấu hình"
- "audit environment" / "health check" / "run doctor"
- "kiểm tra xem rules có bị xung đột hay lệch nhau không"
- "đo xem rules tốn bao nhiêu token"
