# ADR-004 — Agentic-First Vertical Slice Architecture

**Status:** ACCEPTED  
**Reference:** Agentic-first vertical slice architecture pattern.

---

## Context

Traditional horizontal layering (routes/ → services/ → frontend/) makes it hard for AI agents to understand feature scope without reading the entire codebase. When an agent is assigned to work on "the planner feature", it has to read routes, services, frontend components, and tests across different directories.

**Lesson:** Before adding context.md files, agents read the entire codebase for every task. After adding them, agents read only their bounded slice and produced smaller, more focused PRs.

---

## Decision

Adopt Agentic-First Architecture with three pillars:

### Pillar 1 — Agent-Optimized Code Structure (Vertical Slices)
- Each feature slice contains: route + service + frontend component + tests + context.md
- Agents are assigned to slices, not layers
- Slice boundaries are enforced: don't touch another slice without permission

### Pillar 2 — Shadow Documentation (Context Files)
Every slice has a `context.md` that documents:
- Purpose (one sentence)
- Key files
- Domain rules and invariants
- Inputs and outputs
- Tests that define done
- What NOT to do

The root has:
- `AGENTS.md` — operating procedure for all agents
- `.context.md` — global constraints and invariants
- `map.md` — full codebase map with slice locations and API contracts
- `docs/adr/` — architectural decisions with rationale

### Pillar 3 — Autonomy-Enabling Tooling
- Self-correction loop: run tests → fix code → repeat up to 5x → escalate
- Escalation via issue tracker item comments (not chat system, not email)
- Done criteria are failing tests — not descriptions
- Bounce-back: reviewer bounces stage back to coder with actionable feedback

---

## Consequences

**Positive:**
- AI agents can be given a single slice with bounded context — smaller context window usage
- context.md files serve as living documentation for humans too
- Agents have clear done criteria (tests from PRD) — no guessing
- PRs are smaller, more focused, and easier to review

**Negative:**
- Upfront investment: writing context.md for every slice before starting
- Migration: existing horizontal code needs context.md files added (no code move required)
- Discipline required: agents must be instructed to read context.md first, every time

---

## Implementation Checklist (Do Before First Agent Task)

- [ ] `AGENTS.md` written with operating procedure
- [ ] `.context.md` written with global constraints  
- [ ] `map.md` written with all slice locations
- [ ] Each slice has `context.md`
- [ ] ADR-001 through ADR-003 written
- [ ] Failing tests written from PRD acceptance criteria
- [ ] ESLint rule for no mock data added
- [ ] `.env.example` has all required env vars documented
