# RULE 09: HARNESS ENGINEERING & SESSION MEMORY BUFFER

## 1. Lean Pointer Artifact Strategy
- Keep 'implementation_plan.md' and 'walkthrough.md' ultra-lean as navigation maps.
- Use clickable 'file://' markdown links to point directly to source code and line ranges.
- Never duplicate massive source code blocks inside artifacts.

## 2. Session KI Anti-Truncation Buffer
- In long-running sessions, maintain high-signal checkpoints in memory buffers to prevent context truncation amnesia.
- Ensure that if a context truncation event occurs, execution can be resumed with zero latency and zero drift from original requirements.
