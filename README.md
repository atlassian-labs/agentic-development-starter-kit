# Agentic Development Starter Kit

Repository instructions, decision templates, workflow specifications and runnable
examples for preparing engineering work for coding agents. This repository is not
a prebuilt application or a production workflow/authorization service.

## Start with an example

From a fresh checkout, no account, agent session or root `.env` file is required:

```bash
# Node 18+: deterministic scorer and static workflow-contract checks
node --test examples/jira-ai-readiness/test/*.test.js scripts/test-*.js

# Python 3.9+: real local SQLite contract tests
python3 -m unittest discover -s examples/activity-snapshot-contract -v
```

| Resource | What it demonstrates |
| --- | --- |
| [Readiness scorer](examples/jira-ai-readiness/) | Weighted scoring, caps, explicit evidence validation and approval freshness metadata |
| [Activity/snapshot contract](examples/activity-snapshot-contract/) | A decision linked to implementation, a modeled consumer and persisted-data tests |
| [OpenTelemetry example](examples/otel-agent-workflows/) | Workflow tracing and a local performance-diagnosis exercise; follow its own dependency/setup instructions |
| [Workflow contracts](docs/workflow-contracts.md) | Intended gate order and requirements the host runner must implement |

The tests establish the behavior of these examples, not a guarantee that an agent
will follow every instruction or that a production system is protected.

## Copy and adapt the templates

The templates are at this repository's root, not in a `templates/next-idea` folder.
From this checkout, copy them to a **new empty directory**:

```bash
DEST=../my-new-project
# Stop rather than overwrite an existing project.
test ! -e "$DEST" || { echo "Choose a new directory"; exit 1; }
mkdir -p "$DEST/src/agents"
cp AGENTS.md .context.md map.md "$DEST/"
cp -R docs prompts workflows "$DEST/"
cp src/agents/slice-context-template.md "$DEST/src/agents/"
```

For an existing project, review and merge selected templates manually. Do not
replace working repository instructions or erase existing decisions.

1. Replace placeholder project/stack/path information with current reality.
   The root context/map files include an **illustrative** Node/React/SQLite host;
   that host application is not included here. Its paths and commands must be
   adapted, not assumed to exist.
2. Map the actual owners, slices, canonical models, APIs and consumers before
   proposing new code. Start with [the slice-context template](src/agents/slice-context-template.md).
3. Record consequential decisions in repository-local ADRs. Link the decision to
   affected files and named tests. Preserve an original design/wiki link if known;
   ask an owner rather than inventing missing rationale.
4. Write tests that exercise the contract at the right boundary. A mocked call
   assertion and a persisted-data/consumer test answer different questions.
5. Use [Implementation Readiness](docs/ai/jira-ai-readiness-scorer.md) on current
   task, document and canonical-code evidence. Scoring is read-only and separate
   from permission to code.
6. Integrate the workflow into your runner only after implementing and testing its
   [authorization, freshness and retry requirements](docs/workflow-contracts.md).
   The JSON is a template; flags and prompts are not enforcement.

There is no root `package.json`, `server.js` or `.env.example`. Use the commands in
each runnable example. `scripts/check-prerequisites.sh` is a legacy host-application
template with placeholder tooling; customize it for your application before use.

## Selected decisions and workflows

- [ADR-004: local slices/context](docs/adr/ADR-004-agentic-first-slices.md)
- [ADR-009: human checkpoint policy template](docs/adr/ADR-009-human-checkpoint-approval.md)
- [ADR-010: privacy template](docs/adr/ADR-010-pii-and-data-privacy.md)
- [ADR-012: readiness before pickup](docs/adr/ADR-012-ticket-readiness-gate.md)
- [ADR-013: activity/snapshot contract example](docs/adr/ADR-013-activity-snapshot-contract.md)
- [Coding workflow](workflows/plan-execute-review.json): readiness → plan → human approval → execute → review
- [Design workflow](workflows/design-with-nfr-flow.json): inspect existing owners/contracts before proposing a model
- [Prompt examples](prompts/gold-standard-prompt.md): adapt to your repository and actual tools

## Contributing and verification

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep changes focused, public and runnable.
Run the commands above and `git diff --check`. CI also checks the public example
links and workflow templates. These checks do not substitute for review of the
rationale, consumer compatibility or real runner permissions.

## Research artifacts

[Repository-Local Decision Context for Software Agents](research/repository-local-decision-context/)
contains public task cards, de-identified results, evaluator contracts and analysis
for an exploratory study. Read its limitations before using results as evidence;
do not infer a causal reliability or productivity benefit from these examples.
