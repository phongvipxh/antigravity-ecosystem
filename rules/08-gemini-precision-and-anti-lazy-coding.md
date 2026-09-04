# RULE 08: GEMINI PRECISION & ANTI-LAZY CODING

## 1. Gemini Precision Directives
- Specifically addresses Gemini tendency toward over-thinking, tool-looping, and placeholder coding.
- Enforce full code generation: never emit `// ...`, `// rest of code`, or partial implementations.

## 2. Surgical Tool Prioritization
- Always prefer 'replace_file_content' for precise, localized code edits over full-file overwrites.
- Keep execution steps focused, decisive, and aligned with the KISS (Keep It Simple, Stupid) principle.
