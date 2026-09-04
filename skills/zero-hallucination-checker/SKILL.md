---
name: zero-hallucination-checker
description: >-
  Pre-flight verification checklist for eliminating API, library, parameter, and CLI hallucinations.
  Use this skill before generating code that imports external packages, uses complex framework APIs,
  invokes CLI commands with esoteric options, or touches critical data models.
---

# Zero-Hallucination Ground-Truth Verification

This skill serves as a strict pre-flight validation protocol to prevent the LLM from inventing non-existent APIs, methods, options, or configurations.

## Pre-Flight Verification Checklist

Before emitting code changes or CLI commands, verify each checkpoint:

### 1. Package & Dependency Verification
- [ ] Is the package installed in the project? Check `package.json` / `requirements.txt` / `go.mod`.
- [ ] What is the exact installed version? (e.g. Next.js 14 vs 15 have breaking App Router API differences; Pydantic v1 vs v2 have completely different schemas).
- [ ] If not installed, has the user approved adding the dependency?

### 2. Method Signature & Type Verification
- [ ] Do the function, class, and method names match the actual implementation?
- [ ] Are parameter names and types verified against source declarations or `.d.ts` / type annotations?
- [ ] If using third-party libraries, check live documentation via Context7 MCP or official docs rather than guessing arguments.

### 3. File System & Path Verification
- [ ] Do relative import paths match the real directory structure?
- [ ] Are file extensions (`.ts`, `.tsx`, `.js`, `.py`, `.json`) strictly accurate for the target file?
- [ ] Does the destination directory exist before attempting file writes?

### 4. CLI Flag & Shell Command Safety
- [ ] Are all CLI arguments supported by the installed tool version? (Check with `--help` or `-h`).
- [ ] Is the command operating in the correct working directory (`cwd`)?
- [ ] Are destructive actions (e.g. `rm -rf`, `git reset --hard`, `DROP TABLE`) verified with extreme caution?

## Grounding Actions When Uncertain
1. **Tra cứu tài liệu trực tiếp**: Sử dụng Context7 MCP hoặc tra cứu web để lấy exact API signature.
2. **Kiểm tra file khai báo kiểu**: Mở file `.d.ts` trong `node_modules` hoặc file mã nguồn thư viện trong virtualenv.
3. **Chạy thử trong sandbox hoặc test harness**: Kiểm tra behavior với 1 lệnh nhỏ trước khi viết logic phức tạp.
