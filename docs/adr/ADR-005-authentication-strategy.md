# ADR-005 — Authentication Strategy

**Status:** TEMPLATE — fill in your decision  
**Date:** [DATE]  
**Inspired by:** rc-interview-svc ADR-002 (slauth auth strategy)

---

## Context

Every sensitive-data applications service must answer: **who can call this service, and how do we verify their identity?**

This matters more for sensitive-data applications than other teams because our services touch sensitive data:
- Candidate profiles and interview feedback (CodeArena, rc-interview-svc)
- HC review decisions and compensation data (Application Stitching, HC Review)
- Employee transfers and reporting line changes (Workforce Planning)

**Options:**

**Option A — Slauth (internal service-to-service)**
- Token generated via `your-agent-cli slauth generate` or `generate_slauth_token` tool
- Best for: internal microservices called by other internal services
- Limitations: not suitable for direct user-facing calls from browser

**Option B — User Account OAuth (user-facing)**
- User authenticates with their user account via OAuth 2.0
- Best for: tools used directly by users in their browser
- Limitations: requires OAuth app registration, token refresh handling

**Option C — Hybrid (slauth for service-to-service, session cookie for UI)**
- Slauth for inter-service calls
- Session cookie (from SSO) for browser-based user actions
- Best for: services with both an API layer and a UI layer

---

## Decision

**We chose Option [A/B/C]** because [REASON].

---

## Implementation Rules

### If using Slauth:
```javascript
// ✅ Generate token for calling downstream services
const token = process.env.SLAUTH_TOKEN; // injected at deploy time
const response = await fetch('https://target-service/', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// ❌ NEVER hardcode slauth tokens
const BAD_TOKEN = 'eyJhbGc...'; // ← rejected in code review
```

### Token Lifecycle
- Slauth tokens expire — implement refresh before expiry
- Log token refresh events (not the token itself) for audit
- Store tokens in environment variables or secure vault — NEVER in source code or DB

### MCP Tool Authentication
When calling MCP tools via an AI coding agent (`POST /v2/tool`):
- The an AI coding agent session token is separate from slauth — manage both
- Session token persisted to `logs/agent_session_token.json` — excluded from git
- Refresh: call `GlobalServeManager.adoptExistingInstance()` on 401

---

## Consequences

**Positive:** [FILL IN]  
**Negative/Risks:** [FILL IN]  

---

## Related ADRs
- ADR-006 — Rate Limiting Strategy (who can call how often)
- ADR-010 — PII Handling (what authenticated users can access)

---

## Lessons from sensitive-data applications Projects

From rc-interview-svc: **never let the auth decision be implicit**. The service had 3 different auth mechanisms in use simultaneously (slauth, cookie, no-auth on health endpoint) and it caused confusion during incident response. Document every endpoint's auth requirement in the API spec.

Important: **the agent session token is not a downstream service token**. These are two separate auth contexts. A common mistake is assuming that an adopted agent session grants access to downstream services — it does not.
