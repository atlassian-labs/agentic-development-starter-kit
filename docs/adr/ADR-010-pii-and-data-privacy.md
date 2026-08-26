# ADR-010 — PII and Data Privacy Handling

**Status:** ACCEPTED — ENFORCED (sensitive-data applications non-negotiable)  
**Date:** [DATE]  
**Applies to:** ALL sensitive-data applications projects touching candidate, employee, or compensation data

---

## Context

sensitive-data applications projects handle some of the most sensitive data at the organization:
- **Recruiting / CodeArena:** Candidate names, interview feedback, assessment scores, hiring decisions
- **HC Review / Application Stitching:** Employee compensation, promotion decisions, performance ratings
- **rc-interview-svc:** Candidate scheduling preferences, availability, interview context
- **Workforce Planning:** Headcount budgets, org structure, backfill decisions

AI agents introduce new PII risks: prompts sent to LLMs may contain PII, agent artifacts may store PII, and workflow logs may expose PII. This ADR defines the rules.

---

## What Counts as PII in sensitive-data applications Context

| Data Type | PII? | Examples |
|-----------|------|---------|
| Candidate full name | ✅ Yes | "John Smith" |
| Employee email | ✅ Yes | "jsmith@example.com" |
| Interview feedback text | ✅ Yes | "Candidate struggled with..." |
| Hiring decision | ✅ Yes | "Strong hire", "No hire" |
| Compensation figures | ✅ Yes | Salary, bonus, equity |
| Promotion decision | ✅ Yes | "Promoted to P5" |
| stable user account ID (account ID) | ⚠️ Pseudonymous | Use instead of name/email where possible |
| Job requisition ID | ❌ Not PII | "REQ-12345" |
| Team/department name | ❌ Not PII | "Example Department" |
| Interview type | ❌ Not PII | "Technical screen" |

---

## The 5 PII Rules

### Rule 1 — No PII in Agent Prompts Sent to External AI
```javascript
// ❌ NEVER — PII in agent prompt
const prompt = `Review interview feedback for John Smith (john@example.com):
"The candidate demonstrated strong..."`;

// ✅ CORRECT — anonymise before sending to AI
const prompt = `Review interview feedback for Candidate #${candidateId}:
"${feedbackText}"`;
// Candidate name and email stay in your DB — only ID goes to AI
```

**Why:** LLM providers may log prompts. Even with enterprise agreements, PII in prompts is a compliance risk.

### Rule 2 — No PII in Workflow Run Artifacts Stored in Plain Text
```javascript
// ❌ NEVER — store PII in workflow artifact
artifact.content = `Analysis for Jane Doe (jane.doe@example.com)...`;

// ✅ CORRECT — store reference ID, resolve PII at display time
artifact.content = `Analysis for candidate ${candidateId}...`;
// UI resolves candidateId → display name at render time
```

### Rule 3 — No PII in Application Logs
```javascript
// ❌ NEVER
logger.info(`Processing feedback for ${candidate.email}`);

// ✅ CORRECT
logger.info(`Processing feedback for candidate ${candidate.id}`);
```

### Rule 4 — Right to Deletion Must Be Implementable
Every data store that holds PII must support deletion of all records for a given individual:

```sql
-- Required: PII must be deletable by candidate/employee ID
DELETE FROM workflow_artifacts WHERE content LIKE '%' || :candidateId || '%';
DELETE FROM checkpoint_approvals WHERE run_id IN (
  SELECT id FROM workflow_runs WHERE story_id IN (
    SELECT id FROM stories WHERE work_item_key LIKE 'CAND-' || :candidateId || '%'
  )
);
```

Document the deletion procedure in `docs/pii-deletion-procedure.md`.

### Rule 5 — MCP Tool Calls With PII Require Explicit Clearance
Some MCP tools (Gmail, chat system) return content that may include PII (candidate emails, feedback in threads). Before using these tools in a sensitive-data applications context:

1. Confirm the tool is covered by the organization’s enterprise data processing agreement
2. Ensure the data returned is not stored in agent prompts or artifacts
3. Document the clearance in this ADR under "Cleared MCP Tools"

**Cleared MCP Tools (fill in after review):**
- [ ] `mcp__gmail__invoke_tool` — [clearance status]
- [ ] `mcp__chat__invoke_tool` — [clearance status]
- [ ] `mcp__docs_or_issues__invoke_tool` (issue tracker/documentation platform) — [clearance status]

---

## Retention Policy

| Data Type | Retention Period | Deletion Trigger |
|-----------|-----------------|-----------------|
| Interview feedback | 2 years after hiring decision | Candidate deletion request |
| HC review artifacts | 3 years | Employee departure + 1 year |
| Workflow run logs | 90 days | Automatic purge |
| Checkpoint approvals | 5 years (audit) | Legal hold only |
| PII in prompts | 0 days | NEVER STORE |

---

## Implementation Checklist

Before any sensitive-data applications project goes to production:
- [ ] PII audit complete — all data flows documented
- [ ] No PII in agent prompts (code review gate)
- [ ] No PII in logs (grep check in CI)
- [ ] Right-to-deletion procedure documented and tested
- [ ] Retention policy implemented (automated purge jobs)
- [ ] Cleared MCP tools list filled in and reviewed by Security
- [ ] Privacy notice updated to cover AI-assisted processing

---

## Consequences

**Positive:**
- Compliance with GDPR, CCPA, and internal data policies
- Audit trail for all People decisions
- Trust from candidates and employees

**Negative:**
- Pseudonymisation adds complexity — UI must resolve IDs at display time
- Deletion procedures must be tested before production
- Some AI features may be prohibited until MCP tool clearance is obtained

---

## Related ADRs
- ADR-005 — Authentication (controls who can access PII)
- ADR-009 — Checkpoint Approval (approvals must be audited)
- ADR-003 — No Mock Data (mock candidate data is still PII risk if realistic)
