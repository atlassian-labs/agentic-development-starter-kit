# Workflow template contracts

The JSON files describe intended behavior. They are not an authorization service,
a sandbox, or proof that a host runner enforces these requirements.

## Coding flow

`readiness → plan → pre-code-approval → execute → review → done`

- Readiness follows the [rubric](ai/jira-ai-readiness-scorer.md), reads canonical
  evidence and uses the [scorer](../examples/jira-ai-readiness) for the result and fingerprint.
- Readiness and planning are read-only. The runner must enforce tool permissions;
  `is_read_only` and instructions alone cannot restrict a tool.
- A human checkpoint precedes coding. The reviewer sees the readiness result and
  the exact plan before deciding.
- Approval, execution and review bounce to **readiness**, not directly to execution.
  Every retry therefore refreshes the evidence, plan and approval.
- Coding produces a draft PR. Review is advisory; neither it nor completion
  grants merge permission. Automatic unattended advancement is disabled.

## Required host-runner integration

Before every coding attempt, the host must:

1. Authenticate the reviewer and check their authority for this work. Never trust
   an agent-provided identity or a free-text assertion that approval exists.
2. Fetch the current ticket, document versions and canonical commits; rerun
   Implementation Readiness. Require a coding band and resolve remaining blockers
   through the team's authorized governance process.
3. Bind an explicit approval to the resulting fingerprint, rubric version and
   exact plan hash. Record decision, rationale, reviewer identity and timestamp in
   a trusted audit store. Named checkpoints are required for AI Assisted work.
4. Recheck freshness immediately before execution. Missing, denied or changed
   evidence invalidates approval; return to readiness. Check the plan separately:
   the scorer does not accept or hash a workflow plan.
5. Fail closed on missing/invalid checkpoint results, unresolved template inputs,
   unavailable approval storage, authorization errors and exhausted bounce limits.
   A checkpoint timeout must escalate, not imply approval.
6. Pass trusted `approval_artifact`, `readiness_artifact` and `plan_artifact` to the
   execution stage. Recheck any further changes; do not let a prompt override a
   denied operation.

The scorer's `codingAllowed` field describes readiness eligibility, not permission.
`isApprovalFresh` only compares a validated result to stored fingerprint metadata;
it does not authenticate a reviewer, fetch evidence, or start a session.

The optional OpenTelemetry workflow example demonstrates tracing and checkpoint
callbacks. It **does not implement this authorization protocol**: it does not
honor the new `is_read_only` metadata or validate evidence/roles, and its generic
callback defaults are not a fail-closed approval adapter. Do not use it unchanged
for real coding. Runner integration must be separately tested before execution.

## Design flow

Read-only discovery precedes the data-model proposal. Inspect existing owners,
models, APIs, decisions and consumers before considering a new table. Record
reuse, data semantics, migration and verification choices. A human reviews the
result; approval of a design does not bypass implementation readiness.

## What the tests establish

```bash
node --test scripts/test-workflow-contracts.js
```

These static tests parse the actual templates and reject mutated gate ordering,
missing checkpoints, retry bypasses, missing execution inputs and absent contract
metadata. They do not execute an agent or prove runtime authorization. A real
adapter needs tests for rejected/stale approval, unauthorized actors, revoked
access, changed plans, retries and zero coding-tool calls before authorization.

Related: [ADR-009](adr/ADR-009-human-checkpoint-approval.md),
[ADR-012](adr/ADR-012-ticket-readiness-gate.md),
[slice context template](../src/agents/slice-context-template.md).
