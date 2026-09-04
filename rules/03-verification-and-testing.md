# RULE 03: EMPIRICAL VERIFICATION & MECHANICAL TESTING

## 1. Reproduce Before Fixing
- Before writing a fix for any bug, exception, or failure, construct a reproduction script or execute the failing test to observe the exact failure mode first-hand.
- Never claim a bug is resolved based on visual inspection alone.

## 2. Mechanical Exit Code 0 Verification
- Every code change must be validated by running automated tests, linter checks, or compiler builds (`npm test`, `pytest`, `cargo test`, `npm run build`).
- Only accept mechanical proof: the verification command must exit with code 0.
- If a test fails, systematically diagnose the root cause without guessing or thrashing code.

## 3. Hypothesis Ledger Enforcement
- Whenever a test or verification step fails (`exit != 0`), the failure signature is automatically recorded into `.agents/scratchpad.md`.
- The agent MUST review previously eliminated hypotheses before proposing the next mutation. Re-trying the exact same failed fix is strictly prohibited.

