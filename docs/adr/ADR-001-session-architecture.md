# ADR-001 — AI Session Architecture

**Status:** TEMPLATE — fill in your decision  
**Date:** [DATE]  
**Deciders:** [NAMES]

---

## Context

This project uses an AI coding agent as its AI agent framework. A key architectural decision is how AI sessions are managed:

**Option A — Shared singleton session**
- One an AI coding agent instance per server process
- All AI calls (interactive chat, workflow stages, background sync) share one session
- Simpler to implement; lower resource usage
- Risk: context pollution between calls; sessions become a bottleneck under parallel load

**Option B — Session pool**
- N an AI coding agent instances running simultaneously
- Workflow stages assigned to pool members; interactive chat gets its own instance
- More complex; higher resource usage
- Eliminates context pollution and bottlenecks

**Option C — Isolated session per run**
- One an AI coding agent instance per workflow run, destroyed when run completes
- Maximum isolation; no context pollution
- Highest resource usage; slowest startup time per run

---

## Decision

**[CHOOSE ONE AND FILL IN RATIONALE]**

We chose **Option [A/B/C]** because:
- [REASON 1]
- [REASON 2]

---

## Consequences

**Positive:**
- [BENEFIT 1]
- [BENEFIT 2]

**Negative / Risks:**
- [RISK 1 — e.g. context pollution if shared]
- [RISK 2 — e.g. resource overhead if isolated]

**Mitigations:**
- [MITIGATION 1 — e.g. prompt_mode=replace for background tasks]
- [MITIGATION 2 — e.g. token persistence for session recovery]

---

## Lessons learned (Don't Repeat These Mistakes)

1. **If using a shared session:** Always try `adoptExistingInstance()` before starting new — prevents port conflicts and token mismatches
2. **Never silently fall back to a different port** — causes invisible token mismatches where all calls return 401
3. **Persist the session token to disk** — so server restarts can re-adopt without user action
4. **Use `prompt_mode: 'replace'` for all background tasks** — or context pollution will make agents produce output about the wrong project
5. **Design session health monitoring from day 1** — sessions drop after long-running tasks; auto-restart is essential for overnight runs
