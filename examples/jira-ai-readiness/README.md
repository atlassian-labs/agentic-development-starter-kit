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
- Applicable Implementation Readiness requires `evidence.repositoryInspected` to be exactly `true` and at least one `commits` entry with a nonblank repository and a hexadecimal commit ID (7–64 characters). Use the full canonical hash when available. Missing, null, malformed or truthy-string inspection evidence is rejected; the scorer does not silently grant a Ready result.
- Document references require an ID and version. Specification and N/A runs do not require inspected commits, but supplied evidence must be well formed.
- The analyzer must establish that commits really are canonical and documents were read; structural validation cannot prove evidence truth.
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

`isApprovalFresh` compares a scorer result with stored fingerprint/rubric metadata. It does not authenticate or authorize the approver, fetch current evidence, audit an approval, or start a coding session. `codingAllowed` means readiness eligibility, not permission.

Fingerprint format 2 also binds classification, inspection state, ratings/evidence statements, blockers, overrides and inaccessible references. Reordering document/commit lists is immaterial; changing the assessment invalidates earlier approval even when source versions stay the same. Existing stored fingerprints must be re-evaluated and approved after this upgrade. Rubric weights and thresholds remain version 3.

The caller must refresh evidence and validate authority separately, bind the approved workflow plan, and reject stale or missing approval immediately before coding. See [workflow contracts](../../docs/workflow-contracts.md).
