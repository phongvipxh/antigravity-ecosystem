---
name: project-state-manager
description: >-
  Adaptive Project State and Memory Bank manager for maintaining comprehensive living documentation.
  Use this skill when initializing, updating, or reviewing PROJECT_STATUS.md to anchor project context,
  track architectural invariants, preserve session progress, and enable seamless multi-session continuity.
---

# Project State & Memory Bank Manager

This skill defines the standardized protocol for creating and maintaining `PROJECT_STATUS.md` at the project root, keeping it comprehensive, deeply informative, and 100% accurate.

## Standard `PROJECT_STATUS.md` Template

When creating or updating `PROJECT_STATUS.md`, adhere to this comprehensive format:

```markdown
# Project Status & Living State

## 1. Active Focus & Current Phase
- **Current Milestone**: [e.g., Implementing JWT authentication & refresh token rotation]
- **Current Objective**: [e.g., Adding refreshToken middleware and redis session blacklist]
- **Target Completion**: [e.g., Integration tests passing with 100% route protection]

## 2. Architectural Invariants & Conventions
- **State Management**: [e.g., Zustand for client state, TanStack Query for server state]
- **API Standards**: [e.g., RESTful under /api/v1, snake_case request/response JSON]
- **Database Rules**: [e.g., Prisma ORM with PostgreSQL, soft deletes via deletedAt]
- **Auth Guard**: [e.g., Bearer JWT in Authorization header, RBAC roles: ADMIN, USER]

## 3. Core Module & Entrypoint Map
| Module | Entrypoint File | Primary Responsibility |
| :--- | :--- | :--- |
| **Auth** | `src/modules/auth/auth.service.ts` | Login, token issuance, password hashing |
| **Users** | `src/modules/users/user.service.ts` | CRUD profiles, role management |
| **Database** | `src/lib/prisma.ts` | Shared Prisma client instance & hooks |
| **Router** | `src/server.ts` | Express server setup & route mounting |

## 4. Recent Progress & Actionable Next Steps
- [x] Implemented `/auth/login` and `/auth/register` endpoints
- [x] Added unit tests for bcrypt password verification
- [ ] [IN PROGRESS] Implement `/auth/refresh` endpoint and cookie rotation
- [ ] Add rate limiting middleware to public auth routes
```

## Management Guidelines

1. **Comprehensive & Detail-Rich**:
   - Do not artificially cut or truncate important architectural details, schemas, or module listings to save space. Richness of context ensures high accuracy for future sessions.
2. **Never Let Invariants Drift**:
   - If an architectural rule or invariant is established, record it under Section 2 immediately to preserve it across sessions.
3. **Session Handoff Discipline**:
   - At the end of every significant task, update Section 1 (Active Focus) and Section 4 (Progress & Next Steps) so that any future session picks up exactly where work left off with complete clarity.
