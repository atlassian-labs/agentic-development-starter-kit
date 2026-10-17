# Jira AI Coding Readiness Scorer

Rubric version: 3

Use this rubric before an AI coding agent starts work on a Jira ticket. It answers one question:

> Can an AI coding agent implement this ticket, verify the result, and open a reviewable pull request without inventing product behavior or architecture?

The score measures readiness. It does not measure business priority, engineering value, developer performance or effort.

A runnable, deterministic implementation of the scoring rules lives in [`examples/jira-ai-readiness`](../../examples/jira-ai-readiness). The agent gathers evidence and rates each dimension; the scorer applies the weights, caps and bands so the same ratings always produce the same result.

## Two stages

- **Specification Readiness** runs during grooming. It reads Jira, comments, child work items, dependencies, attachments and the current body of linked documents. It is capped at 69, so it can never reach a coding band.
- **Implementation Readiness** runs immediately before AI pickup. It adds a bounded, read-only scan of the canonical code, tests, open pull requests and repository instructions. Only this stage can reach the full 100 points.

## Required behavior

The analyzer must:

1. Read the current Jira description, comments, links, attachments, dependencies and status. If the ticket cannot be read, stop. Never score from a title or a cached copy.
2. Traverse parent and child relationships until no new descendants are found, and score each active implementation-level child on its own.
3. Read the current body of every linked product, design, architecture, incident and API document. A link title or search snippet is not evidence.
4. Inspect the canonical repository branch before deciding that unstarted work remains.
5. Separate verified evidence from inference, and report conflicts between Jira, documents and code instead of picking one.
6. Classify the ticket before scoring it.
7. Rate every dimension with a short evidence statement.
8. Apply hard caps after the subtotal.
9. List the smallest ticket edits that would improve readiness.
10. Record the Jira timestamp, linked-document versions and canonical commit hashes used as evidence.
11. Stay read-only. Never create a branch, commit, pull request, label or coding session as part of readiness analysis.

The analyzer must not invent owners, repositories, classes, APIs, test commands, dependencies or acceptance criteria.

## Step 1: classify

| Classification | Meaning | Result |
| --- | --- | --- |
| Applicable | A bounded implementation, defect, test, migration or configuration task | Score it |
| Needs decomposition | Too large for one reviewable pull request | Split it and score the children |
| Human-led | Product behavior, UX, architecture, security or ownership is undecided | Resolve the decision first |
| Already underway | Implementation or review is in progress | N/A for current pickup |
| Already implemented | The canonical branch already has the behavior but Jira looks unstarted | N/A; reconcile Jira |
| Not coding | Research, operations, enablement, planning or coordination | N/A; route elsewhere |

## Step 2: collect evidence

| Evidence | Preferred source |
| --- | --- |
| Current and expected behavior | Jira description, acceptance criteria, comments, product document |
| Reproduction | Jira evidence, logs, test data, environment URL |
| Code ownership and paths | Current repository, CODEOWNERS, service catalog |
| API or schema behavior | Current schema and implementation |
| UX behavior | Approved design and current UI code |
| Dependencies | Jira links, pull requests, deployment status |
| Test commands | Repository guidance and build files |
| Risk and rollout | Runbook, feature gate, migration plan, observability configuration |

The Implementation Readiness code scan is read-only, limited to two repositories and 30 minutes, and records the commit hash it inspected. It checks whether the requested behavior is absent, partial, complete or conflicting; the owning module or surface; test conventions and commands; open pull requests, feature gates and deployment state; and whether Jira, linked decisions and code agree.

## Step 3: rate seven dimensions

Each dimension is rated 0 to 5 and multiplied by its weight. A perfect ticket scores 100.

| Dimension | What a 5 looks like | Multiplier | Maximum |
| --- | --- | ---: | ---: |
| Problem definition | Current and expected behavior, persona and reason are explicit | 3 | 15 |
| Behavioral specification | Testable acceptance criteria, edge cases and non-goals | 4 | 20 |
| Technical discoverability | Owning code, APIs and data verified on the canonical branch | 3 | 15 |
| Verification | A failing or named test defines done; commands are known | 3 | 15 |
| Dependencies and environment | No unresolved blockers; required environments exist | 3 | 15 |
| Scope and decomposition | Fits one reviewable pull request | 2 | 10 |
| Risk and governance | Rollout, observability, rollback, privacy and authorization are clear | 2 | 10 |

Behavioral specification carries the most weight because it is what stops an agent from inventing product behavior.

## Step 4: apply hard caps

Caps are applied after the subtotal, and the lowest applicable cap wins. A number never overrides a blocker.

**Cap 49**

- A required product, UX, API, schema or ownership decision is missing.
- A page or source required to resolve behavior, design, contract, security or rollout cannot be read.
- Privacy or authorization behavior is unclear.
- Current code and the linked design conflict with no recorded migration decision.
- A blocking dependency is unresolved.

**Cap 69**

- The canonical repository is known but was not inspected. This applies automatically to every Specification Readiness run.
- A required environment is unavailable.
- A medium or high-risk rollout has no observability or rollback plan.
- The work spans multiple pull requests or repositories without explicit sequencing.

Every cap must name its evidence and the smallest ticket edit or decision that removes it. A person may override a cap, but only with a written reason that stays visible in the report.

## Step 5: band and execution mode

| Final score | Band | Allowed behavior |
| ---: | --- | --- |
| 85-100 | AI Ready | May implement after fresh evidence, human approval and normal repository authorization |
| 70-84 | AI Assisted | May implement with named and recorded human checkpoints |
| 50-69 | Grooming Required | May investigate and propose edits; must not implement |
| 0-49 | Not Ready | Product, design, architecture, dependency or safety work is required |
| N/A | Not a current coding pickup | Route to the right workflow or reconcile Jira |

## Freshness and approval

Each result carries an evidence fingerprint built from the Jira update time, the rubric version, the stage, linked-document versions and the inspected commit hashes. A human approves a specific fingerprint. If any of those inputs change before coding starts, the approval is stale and Implementation Readiness must run again.

Keep readiness and coding as separate steps:

- Post the readiness report to Jira. Do not create a readiness-only branch or pull request.
- Apply a label such as `coding-agent-ready` only after a person approves a fresh Implementation Readiness fingerprint, and remove it when the fingerprint goes stale.
- Start one coding-agent session per work item. The resulting pull request is a draft, links to the approved readiness comment, and never auto-merges.

## Output

One Markdown comment, normally under 3,500 characters, with:

- the band and final score;
- the allowed next step;
- the dimension table with ratings, points and evidence;
- blocking gaps with the smallest fix for each;
- any human overrides and their reasons; and
- metadata: stage, classification, subtotal, cap, rubric version, evidence fingerprint and inaccessible evidence.

## Worked examples

These are encoded as tests in [`examples/jira-ai-readiness/test`](../../examples/jira-ai-readiness/test).

| Example | Given | Expected |
| --- | --- | --- |
| A | A bug with reproduction, expected behavior, a failing test, no dependency and low-risk rollout | Applicable, at least 85, no cap, AI Ready |
| B | A UI story with clear intent but no approved design | No higher than 49; required edit is an approved design |
| C | Backend and frontend change in one ticket with no deployment order | Scope rated 2 or lower; no higher than 69 |
| D | A task to schedule training sessions | Not coding; N/A; no implementation plan |
| E | An unreadable Jira key | No score; access failure reported |
| F | A story with active implementation children | Each child discovered and scored independently |
| G | A ticket linking a current design page | Page body read before scoring; the link alone adds nothing. If the page is inaccessible, no higher than 49 |
| H | A To Do ticket whose behavior already exists on the canonical branch | Already implemented; N/A; reconcile Jira |
| I | Strong Jira and design evidence, repository known but not inspected | Specification Readiness; no higher than 69; cannot code |
| J | The evidence changes after approval | Approval stale; Implementation Readiness runs again |
