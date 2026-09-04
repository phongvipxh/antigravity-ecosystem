# RULE 06: ADAPTIVE STATE & LIVING MEMORY BANK

## 1. Living Project Status Map
- For complex, multi-step technical initiatives, maintain an active living state map in `PROJECT_STATUS.md`.
- Anchor project scope, architectural invariants, verified decisions, and roadmap checkpoints across conversation boundaries.

## 2. State Synchronization
- Update state documentation upon completing verifiable execution checkpoints. Ensure any subsequent agent or developer can instantly resume work without context loss.

## 3. Cross-Session Reflection Ledger (`lessons.jsonl`)
- Persist verified solutions from resolved debugging loops into `~/.gemini/config/lessons.jsonl` (global) and `.agents/lessons.jsonl` (project).
- Automatically recall prior solutions on matching error signatures to avoid re-solving known issues across sessions.
- Automatically distill lessons when scratchpad failure states resolve to mechanical Exit Code 0.

