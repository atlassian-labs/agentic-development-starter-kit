---
name: jira-ai-readiness
description: Score a Jira ticket for specification or implementation readiness using Jira, linked documents, dependencies and a bounded canonical code scan. Use during grooming or immediately before an AI coding agent starts work.
---

# Jira AI Readiness

The canonical rubric is [`docs/ai/jira-ai-readiness-scorer.md`](../../../../docs/ai/jira-ai-readiness-scorer.md). Do not copy or reinterpret the weights here. The rubric owns the version, formula, evidence rules, hard caps, bands and examples.

Your job is to gather evidence and rate it. The deterministic scorer in [`examples/jira-ai-readiness`](../../../../examples/jira-ai-readiness) does the arithmetic.

## Workflow

1. Read the rubric.
2. Read the Jira ticket from its current source using your issue-tracker tool. If it cannot be read, stop and report the access problem.
3. Traverse parent and child relationships until no new descendants are found. Score each active implementation child on its own.
4. Read comments, attachments, links, dependencies, designs and related pull requests.
5. Open every relevant linked document and read its current body. Record its version. Record anything you could not open.
6. Choose the stage: Specification Readiness during grooming, Implementation Readiness immediately before pickup.
7. For Implementation Readiness, scan at most two repositories for at most 30 minutes, read-only, and record the commit hash you inspected.
8. Classify the ticket. If it is not Applicable, stop with N/A and the routing action.
9. Rate each of the seven dimensions 0-5 with one sentence of evidence.
10. List every hard blocker with its evidence and the smallest fix.
11. Write the result as JSON matching the scorer input (see the fixtures), then run:

    ```bash
    node examples/jira-ai-readiness/bin/score.js readiness.json
    ```

12. Return the scorer's Markdown report. Do not change the number by hand.

## Evidence rules

- Separate verified facts from inference.
- Search snippets and link titles are not evidence. Read the source.
- An inaccessible required page is a hard blocker unless another authoritative source resolves the same facts.
- When Jira, documents and code disagree, report the conflict.
- Return N/A when the work is already implemented or already underway.
- Do not invent owners, repositories, classes, APIs, test commands, dependencies or acceptance criteria.

## Boundaries

- Stay read-only unless a person explicitly asks for a Jira or repository change.
- Never create a branch, commit, pull request, label or coding session during readiness analysis.
- A readiness result is not permission to code. Coding requires a person to approve a fresh Implementation Readiness fingerprint in the AI Ready or AI Assisted band.
