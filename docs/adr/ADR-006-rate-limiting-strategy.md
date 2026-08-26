# ADR-006 — Rate Limiting Strategy

**Status:** TEMPLATE — fill in your decision  
**Date:** [DATE]  
**Inspired by:** rc-interview-svc ADR-003 (rate limiting strategy)

---

## Context

AI agent calls are expensive in two ways:
1. **Cost** — Each an AI coding agent call consumes LLM tokens. Uncontrolled workflow runs can consume thousands of dollars of compute in a single overnight vibe mode session.
2. **Contention** — A single runaway workflow run can starve all other users of the shared an AI coding agent session.

**Lesson:** 18 workflow runs were started simultaneously with a shared agent session. After 8 hours, only 2/18 had completed. The others were queued. Without rate limiting, parallel runs collapse into sequential execution.

---

## Rate Limiting Decisions Required

### 1. Per-User Limits
How many workflow runs can a single user trigger per hour?

```
[ ] Option A — No limit (trust users)
[ ] Option B — N runs per hour per user (recommended: 5)
[ ] Option C — N concurrent runs per user (recommended: 2)
```

**Decision:** [CHOOSE AND FILL IN RATIONALE]

### 2. Per-Service Limits
How many total AI calls can the service make per minute?

```
[ ] Option A — No limit (trust the AI provider's limits)
[ ] Option B — N calls per minute across all users (recommended: 20)
[ ] Option C — Token budget per day ($X equivalent)
```

**Decision:** [CHOOSE AND FILL IN RATIONALE]

### 3. Behaviour When Limit Reached
```
[ ] Option A — Queue the request (user waits)
[ ] Option B — Reject with 429 + retry-after header
[ ] Option C — Degrade gracefully (run without AI, notify user)
```

**Decision:** [CHOOSE AND FILL IN RATIONALE]

### 4. Cost Attribution
Who pays for the AI tokens consumed?
```
[ ] Option A — Service absorbs all costs (no user visibility)
[ ] Option B — Track per-user consumption for reporting
[ ] Option C — Hard per-user budget with automatic cutoff
```

---

## Implementation

### Rate Limit Middleware (Express)
```javascript
'use strict';
const rateLimit = require('express-rate-limit');

// Per-user workflow run rate limiter
const workflowRunLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // max 5 workflow runs per user per hour
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Rate limit exceeded — max 5 workflow runs per hour', retryAfter: '1 hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to workflow run creation endpoint
router.post('/api/workflow-runs', workflowRunLimiter, async (req, res) => { ... });
```

### Session Pool Sizing
The session pool size determines true parallelism. Formula:
```
MAX_CONCURRENT_RUNS = ROVO_DEV_INSTANCES × MAX_CONCURRENT_CHATS_PER_INSTANCE

Example: 3 instances × 3 chats = 9 truly parallel runs
```

Set `MAX_CONCURRENT_RUNS` as your hard cap on queued workflow runs.

### Monitoring
Track these metrics:
- `workflow.runs.queued` — runs waiting for a session slot
- `workflow.runs.rate_limited` — runs rejected by rate limiter
- `ai.tokens.consumed.per_user` — token usage by user per day
- `ai.session.wait_time_ms` — time spent waiting for a session slot

---

## Consequences

**Positive:**
- Prevents runaway costs
- Ensures fair access across users
- Provides predictable session availability

**Negative:**
- Users with bursts of work will hit limits
- Requires monitoring infrastructure

---

## Related ADRs
- ADR-001 — Session Architecture (determines pool size)
- ADR-005 — Authentication Strategy (needed to identify "per user")
