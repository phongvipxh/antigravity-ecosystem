# RULE 02: GROUND TRUTH & UNIVERSAL LIVE SEARCH

## 1. Mandatory Universal Live Search
- Whenever a user query or technical task involves real-time information, third-party libraries, CLI flags, package versions, release dates, or evolving framework APIs (e.g. Next.js, Tailwind CSS, Playwright, Node.js, Python), you MUST execute real-time live search or documentation lookup before generating code.
- Never rely on static training cutoffs for external library APIs, command-line arguments, or security advisories.

## 2. Ground Truth Verification Protocol
- Always verify package names, import paths, and function signatures against official, authoritative documentation.
- Never hallucinate non-existent parameters, deprecated options, or imagined configuration keys.
