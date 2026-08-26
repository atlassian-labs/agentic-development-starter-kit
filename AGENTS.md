# Agent Operating Procedure — [YOUR PROJECT NAME]

> **Read this before touching any code.** This is the operating procedure for all AI agents (an AI coding agent) working on this codebase. Follow it precisely to avoid regressions, duplicate work, and context pollution.

---

## Pre-Task Checklist (Do This First — Every Time)

Before implementing anything, read these files in order:

1. **`map.md`** (root) — Understand the vertical slice architecture and which files you're touching
2. **`.context.md`** (root) — Global constraints, environment setup, code style, never-do rules
3. **`src/[your-slice]/context.md`** — Slice-specific domain rules and invariants
4. **All ADRs in `docs/adr/`** referenced by your slice — Understand past architectural decisions
5. **`src/database/schema.sql`** (if it exists) — Know the DB table structure before writing queries
6. **Failing tests for your slice** — These are your definition of done

**Why?** Agents who skip this cause regressions, schema mismatches, and duplicate work.

---

## How to Implement a Feature

### 1. Understand Your Done Criteria
- Read the failing tests for your slice — they are your unambiguous definition of done
- If there are no tests: **stop and ask** — never implement without a clear done criteria
- Read the task description and all linked ADRs

### 2. Implement
- Write code to make the failing tests pass
- Follow the code style from `.context.md`
- Never hardcode credentials, IDs, or environment-specific values
- Use the database connection module — never import the DB driver directly
- Keep changes within your assigned slice — do NOT touch other slices without permission

### 3. Run Tests
```bash
npm test                 # Backend tests
npm run test:frontend   # Frontend tests  
npm run test:all        # Everything
```

### 4. Fix Failures
- Read the full error output — don't skim
- **Never modify a test to make your code pass** — if the test is wrong, stop and escalate
- Fix the implementation. Repeat until all tests pass.

### 5. Self-Correction Loop
- If tests still fail after **5 attempts**: **stop and escalate**
- Comment on the issue tracker item with: what you tried, the error output, your best guess at root cause

---

## When You're Done

✅ All tests pass — `npm test` shows 0 failures  
✅ No changes outside your slice — run `git diff --name-only` to verify  
✅ Comment on the issue tracker item: what you built (1-2 sentences), key decisions, blockers hit  

---

## When You're Blocked

### Missing Interface
**Symptom:** You need a function from another slice that doesn't exist.  
**Action:** Stop. Comment on issue tracker: `"Need interface: sliceName.functionName(args) → ReturnType"`. Wait.

### Ambiguous Domain Rule
**Symptom:** You're unsure whether to validate in route vs service, or how to normalise a schema.  
**Action:** Stop. Comment on issue tracker with your best guess and ask for confirmation. Don't assume.

### Tests Won't Pass After 5 Attempts
**Symptom:** Still failing. You're not sure if it's your code or the test.  
**Action:** Stop. Comment with the test name, failure output, and your analysis. Request pairing.

**Golden Rule: Never modify a test to make your code pass.**

---

## Context Pollution Prevention

This is the #1 agent failure mode. Before every background task (workflow stage, sync job, plan generation):

```
✅ Use prompt_mode: 'replace' — replaces entire session context
✅ Start your prompt with: "CONTEXT RESET. You are working on [PROJECT]. Ignore all prior conversation."
✅ Explicitly exclude irrelevant domains: "Do NOT discuss [OTHER_PROJECT]."
✅ Be self-contained — assume zero prior context in your prompt
```

---

## Stack Reference

| Layer | Tech | Notes |
|-------|------|-------|
| Server | Node.js 18+ / Express | CommonJS, async/await |
| Frontend | React 18 | Functional components + hooks only |
| Database | SQLite3 | Via `src/database/connection.js` only |
| Bundler | Webpack 5 | Client-side code |
| Testing | Jest | node env (backend), jsdom env (frontend) |
| Agent Framework | an AI coding agent | Via GlobalServeManager |

---

## Key Commands

```bash
npm run dev            # Run server + webpack (watch mode)
npm test               # Backend tests (jest --testEnvironment=node)
npm run test:frontend  # Frontend tests (jest --testEnvironment=jsdom)
npm run test:all       # All tests
npm run build          # Production webpack build
npm run setup          # Initialize DB schema
npm run data:reset     # Clear all data (dev only)
```

---

## Never Do This

- ❌ Hardcode credentials, tokens, IDs, or email addresses in code
- ❌ Create mock/fake data in production code paths (only in test fixtures)
- ❌ Modify tests to make your code pass — escalate instead
- ❌ Import the DB driver directly — always use `src/database/connection.js`
- ❌ Use TypeScript or class-based React components
- ❌ Create API routes outside `src/backend/routes/`
- ❌ Touch another slice's files without explicit permission
- ❌ Use `GlobalServeManager.chat()` for plan generation — use `_chatDirectFresh()` instead

---

## Always Do This

- ✅ CommonJS (`require`/`module.exports`)
- ✅ `async/await` (not Promises or callbacks)
- ✅ Parameterized SQL queries (`db.run('SELECT * WHERE id = ?', [id])`)
- ✅ React functional components + hooks
- ✅ Read context.md before writing any code
- ✅ Log decisions and blockers on the issue tracker item
- ✅ Run all tests before declaring done

---

## Questions?

1. Search `src/` for similar code — copy the pattern
2. Read the issue tracker item — it may contain context
3. Read the failing tests — they are executable documentation
4. Read `docs/adr/` — past decisions explain why things are the way they are

If still unclear: **comment on the issue tracker item with what you've already tried.**
