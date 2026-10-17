# ADR-012 — Ticket Readiness Gate Before Agent Pickup

**Status:** ACCEPTED (adapt thresholds to your team before first use)  
**Date:** 2026-10-17  
**Critical for:** Any workflow where an AI coding agent picks up Jira tickets

---

## Context

A well-prepared repository cannot rescue an ambiguous ticket, and a detailed ticket cannot rescue a design document that no longer matches the code. Agents fill gaps with plausible guesses instead of asking. The most expensive guesses are about product behavior, data contracts and old design decisions, because they can pass tests and reach production.

We needed a consistent answer, before any agent starts, to one question: can an agent implement this ticket, verify it and open a reviewable pull request without inventing product behavior or architecture?

---

## Decision

Every ticket passes a readiness gate before an agent may code. The gate is defined in [`docs/ai/jira-ai-readiness-scorer.md`](../ai/jira-ai-readiness-scorer.md) and implemented deterministically in [`examples/jira-ai-readiness`](../../examples/jira-ai-readiness).

1. **Classify before scoring.** Epics, human-led decisions, work already underway or already implemented, and non-coding work return N/A with a routing action instead of a number.
2. **Two stages.** Specification Readiness during grooming is capped at 69. Implementation Readiness adds a bounded, read-only code scan and is the only stage that can unlock coding.
3. **Seven weighted dimensions, 100 points.** Behavioral specification carries the most weight.
4. **Hard caps override the number.** Missing decisions, inaccessible required evidence, unclear privacy or authorization, code-design conflicts and unresolved blocking dependencies cap at 49. An uninspected repository, missing environment, unobservable rollout or unsequenced multi-PR work caps at 69.
5. **Evidence, not links.** Linked pages count only after their current body is read. Conflicts are reported, not resolved silently.
6. **Approval is tied to a fingerprint.** A person approves a specific evidence fingerprint. Any change to the ticket, linked documents, inspected commits, stage or rubric version makes the approval stale.
7. **Readiness and coding are separate.** Readiness analysis is read-only. Coding needs a fresh, approved Implementation Readiness result in the AI Ready or AI Assisted band, produces a draft pull request and never auto-merges.

---

## Consequences

**Positive**

- Agents start from tickets that say what to build, how to verify it and what not to touch.
- Blockers come with the smallest fix, so grooming has a concrete to-do list.
- The same ratings always produce the same score, so results can be compared across tickets and calibrated later.

**Negative**

- Every ticket costs an analysis run, and Implementation Readiness costs a code scan.
- The ratings are still a model's judgement. The scorer makes the arithmetic deterministic, not the evidence.
- The thresholds are a starting point. Calibrate them against real delivery outcomes before relying on them.

---

## Related

- [ADR-004 — Agentic-first slices](ADR-004-agentic-first-slices.md)
- [ADR-009 — Human checkpoint approval](ADR-009-human-checkpoint-approval.md)
- [ADR-010 — PII and data privacy](ADR-010-pii-and-data-privacy.md)
