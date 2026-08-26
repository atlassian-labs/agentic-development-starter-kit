# ADR-009 — Human Checkpoint Approval Workflow

**Status:** TEMPLATE — fill in before starting multi-team work  
**Date:** [DATE]  
**Critical for:** Application Stitching (HC Review + Transfers), CodeArena (interviewer + candidate), any multi-team feature

---

## Context

Human checkpoints are where automated agent workflows pause for human judgment. For single-person projects, the approver is obvious. For multi-team projects like Application Stitching (touching HC Review, Transfers, and Workforce Planning simultaneously), the following questions must be answered before work starts:

1. Who can approve at each checkpoint?
2. What constitutes a valid approval?
3. What happens if two teams disagree?
4. How long before an unapproved checkpoint escalates?
5. Where is every approval recorded for audit?

**Lesson:** The user could see the workflow panel but could not find the artifact to review. The checkpoint asked for approval before the artifact was visible. This was a UX failure — but it is also an approval workflow failure: the approver did not know what they were approving.

---

## Checkpoint Definition Template

For each human checkpoint in your workflow, fill in:

```yaml
checkpoint:
  stage_key: "user-reviews-design"
  name: "Design Review"
  
  # Who can approve
  approvers:
    - role: "Tech Lead"          # role name, not person name
    - role: "PM"                 # at least one of these roles must approve
  requires_all: false            # false = any one approver; true = all must approve
  
  # What they're reviewing
  artifact_from_previous_stage: "design-doc"   # shown above the checkpoint
  review_checklist:
    - "Architecture aligns with ADR-001 through ADR-004"
    - "NFR requirements are met (per ADR section 2)"
    - "No PII is stored in agent prompts (per ADR-010)"
    - "All open questions have been answered"
  
  # Escalation
  escalation_after_hours: 24    # auto-escalate if not approved within 24h
  escalation_to: "Engineering Manager"
  
  # Audit
  log_approval: true            # always true for sensitive-data applications
  approval_fields_required:
    - "decision: approve | bounce | escalate"
    - "rationale: string (min 20 chars)"
    - "approver_id: stable user account ID"
```

---

## Multi-Team Conflict Resolution

When two teams must both approve but disagree:

1. **Day 1-2:** Teams discuss async in the task comment thread
2. **Day 3:** If unresolved, tech leads from each team sync for 30 mins
3. **Day 3+:** If still unresolved, escalate to joint Engineering Manager decision
4. **Never:** Block a workflow run indefinitely without escalation — set `escalation_after_hours: 72` at most

---

## Audit Requirements (sensitive-data applications)

Every checkpoint approval MUST be logged with:
- Approver stable user account ID (not name — names change)
- Timestamp (UTC, ISO 8601)
- Artifact version at time of approval (content hash)
- Decision: approve / bounce / escalate
- Rationale (minimum 20 characters — prevents rubber-stamp approvals)

```sql
CREATE TABLE checkpoint_approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES workflow_runs(id),
  stage_key TEXT NOT NULL,
  approver_account_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'bounce', 'escalate')),
  rationale TEXT NOT NULL,
  artifact_content_hash TEXT NOT NULL,
  approved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## UX Requirements for Checkpoints

Based on real workflow failures — every checkpoint MUST:
1. **Show the artifact BEFORE the approval button** — approver sees what they're approving
2. **Show the review checklist** — approver confirms each item explicitly
3. **Require rationale text** — minimum 20 characters
4. **Show who else needs to approve** — if multi-approver, show their status
5. **Show the escalation deadline** — "Auto-escalates to [name] in 18 hours"

---

## Consequences

**Positive:**
- Clear accountability for every approval
- No rubber-stamp approvals
- Escalation prevents indefinite blocking

**Negative:**
- Adds process overhead — each checkpoint requires checklist completion
- Multi-approver checkpoints slow the workflow

---

## Related ADRs
- ADR-010 — PII Handling (what's appropriate to show at a checkpoint)
- ADR-003 — No Mock Data (checkpoint artifacts must show real data)
