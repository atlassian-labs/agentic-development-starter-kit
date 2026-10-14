# CNCF OpenTelemetry Implementation and Article Plan

## Scope

This work produces one public example and two CNCF article submissions.

1. **Teaching Coding Agents to Debug Performance with OpenTelemetry**
2. **Tracing Plan–Execute–Review Agent Workflows with OpenTelemetry**

The example is vendor-neutral and must run without access to Atlassian systems or a commercial model API.

## Shared implementation

`examples/otel-agent-workflows/` provides:

- a workflow runner that reads `workflows/plan-execute-review.json`;
- workflow, stage, tool, retry, bounce, and checkpoint spans;
- an in-memory exporter for tests;
- OTLP/HTTP and console exporters for demonstrations;
- deterministic happy-path, bounce, and failure scenarios;
- a local OpenTelemetry Collector and Jaeger configuration;
- a small slow-service scenario for performance diagnosis;
- bounded diagnostic commands that do not expose prompt or source content.

## Article 1: Local performance debugging

### Reader problem

A coding agent can make tests pass while introducing N+1 calls, slow dependencies, or memory pressure. Test output says whether behavior is correct; telemetry shows why it is slow.

### Demonstration

1. Start the local collector and trace backend.
2. Run a sample workload with a seeded N+1 lookup.
3. Give the agent a bounded trace-summary command.
4. Identify the repeated child spans and affected request.
5. Apply the batch-query fix.
6. Re-run the same workload.
7. Compare request duration and child-span count.

### Required evidence

- exact seed and workload;
- before/after request duration distribution;
- before/after repeated query-span count;
- correct diagnosis and no false diagnosis;
- tracing overhead measured separately;
- commands and source available publicly.

## Article 2: Agentic workflow tracing

### Reader problem

Multi-stage agent workflows fail through context pollution, retries, bounce loops, tool failures, and invisible checkpoint waits. Flat logs do not show the run as one causal operation.

### Demonstration

1. Load the existing plan–execute–review specification.
2. Run a happy path.
3. Run a review bounce that repeats execute and review.
4. Run a tool failure.
5. Inspect the trace tree and stage attributes.
6. Show how prompt content and artifacts are intentionally excluded.

### Required evidence

- trace tree for each scenario;
- accurate stage attempt and bounce counts;
- errors marked without sensitive exception text;
- disabled exporter does not break the workflow;
- basic runtime overhead from repeated local runs.

## Evaluation method

This is a small, reproducible engineering case study. Report descriptive statistics and associations only.

- Primary observation: elapsed time to the correct diagnosis.
- Secondary observations: request or stage duration, number of repeated spans, tool-call count, retry count, and checkpoint wait.
- Guardrails: diagnosis correctness, false diagnoses, tracing overhead, and export failure behavior.
- Run each deterministic scenario multiple times after warm-up.
- Report environment, sample count, median, range, and raw results.
- Do not generalize from the demo to organization-wide engineering productivity.

## Publication boundaries

- No Atlassian product pitch.
- No internal URLs, service names, data, screenshots, or identifiers.
- Name OpenTelemetry and other CNCF projects precisely.
- Identify custom `agentic.*` attributes as conventions, not official semantic conventions.
- Use a public example repository and reproducible commands.
- Complete the repository external-share checklist before submission.
