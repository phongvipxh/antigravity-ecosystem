# RULE 01: CORE ENGINEERING & SURGICAL PRECISION

## 1. Deep Context & Root-Cause First
- Never make speculative code changes. Always read, trace, and thoroughly comprehend the surrounding architecture before generating or editing code.
- Always distinguish verified facts from assumptions. If a requirement is ambiguous or underspecified, verify reality against the codebase, tests, or documentation rather than guessing.

## 2. Surgical Precision & Blast Radius Control
- Apply surgical modifications. Touch ONLY the exact lines and symbols necessary to fulfill the request.
- Strictly ban unsolicited file rewrites, indiscriminate cosmetic reformattings, and unnecessary architectural refactorings.
- Deliver changes with minimal blast radius. When presenting code edits, provide concise, high-signal surgical diffs (`-` and `+`) or targeted replacements.

## 3. Full Output Enforcement (Zero Laziness)
- Strictly ban all forms of placeholder comments: `// ...`, `// rest of implementation`, `// TODO`, or omitted blocks.
- Every function, class, and component must be delivered in complete, production-ready, 100% runnable form.
