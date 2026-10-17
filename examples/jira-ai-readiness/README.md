# Jira AI readiness scorer

A dependency-free Node implementation of the [Jira AI Coding Readiness rubric](../../docs/ai/jira-ai-readiness-scorer.md).

An agent (see the [`jira-ai-readiness` skill](../../src/agents/skills/jira-ai-readiness/SKILL.md)) reads the ticket, linked documents and code, then writes its classification, ratings and blockers as JSON. This package turns that JSON into a deterministic score and a Jira-ready Markdown comment. It does not call Jira or an LLM.

It enforces:

- seven weighted dimensions that add up to 100;
- classification first, with N/A for work that should not be scored;
- hard caps at 49 and 69, where the lowest cap wins;
- an automatic 69 cap on every Specification Readiness run;
- evidence and a smallest fix for every blocker;
- human overrides only with a written reason;
- an evidence fingerprint, and a check that an approval still matches it.

## Run it

```bash
cd examples/jira-ai-readiness
npm test
npm run score:defect   # AI Ready (95/100)
npm run score:design   # Not Ready: 81 capped at 49
npm run score:spec     # Grooming Required: 86 capped at 69
node bin/score.js fixtures/clear-defect.json --json
```

Requires Node 18 or later. There is nothing to install.

## Input

```json
{
  "ticket": { "key": "DEMO-101", "updatedAt": "2026-10-01T09:00:00Z" },
  "stage": "implementation",
  "classification": "applicable",
  "ratings": {
    "problemDefinition": { "rating": 5, "evidence": "..." },
    "behavioralSpecification": { "rating": 5, "evidence": "..." },
    "technicalDiscoverability": { "rating": 4, "evidence": "..." },
    "verification": { "rating": 5, "evidence": "..." },
    "dependenciesAndEnvironment": { "rating": 5, "evidence": "..." },
    "scopeAndDecomposition": { "rating": 5, "evidence": "..." },
    "riskAndGovernance": { "rating": 4, "evidence": "..." }
  },
  "blockers": [
    { "id": "missing_decision", "evidence": "...", "smallestFix": "..." }
  ],
  "overrides": [
    { "blocker": "missing_decision", "approvedBy": "...", "reason": "..." }
  ],
  "evidence": {
    "repositoryInspected": true,
    "linkedDocuments": [{ "id": "design-page", "version": 7 }],
    "commits": [{ "repository": "example-service", "sha": "4f2c9a1" }],
    "inaccessible": []
  }
}
```

- `stage`: `specification` or `implementation`
- `classification`: `applicable`, `needs_decomposition`, `human_led`, `already_underway`, `already_implemented` or `not_coding`
- Blocker IDs are listed in [`src/score.js`](src/score.js) under `BLOCKERS`.

Set `ticket.readable` to `false` when the ticket could not be read. The scorer then refuses to produce a score.

## Approval freshness

```js
const { scoreTicket, isApprovalFresh } = require('./src/score');

const result = scoreTicket(input);
// Store { fingerprint: result.fingerprint, rubricVersion: result.rubricVersion } when a person approves.
// Before coding starts, re-run Implementation Readiness and check:
isApprovalFresh(currentResult, storedApproval); // false if anything changed
```

`isApprovalFresh` returns `true` only for an Implementation Readiness result in the AI Ready or AI Assisted band whose fingerprint matches the stored approval.
