# CNCF Proposal 2 — Tracing Plan–Execute–Review Agent Workflows with OpenTelemetry

## Submission type

Case study / implementation guide

## CNCF project

OpenTelemetry

## Proposed title

**Tracing Plan–Execute–Review Agent Workflows with OpenTelemetry**

Alternative: **Making Agent Retries, Tool Calls, and Human Checkpoints Visible with OpenTelemetry**

## Authors

- Prasanna Bableshwar
- Proposed co-author: Anand Shastri

## Abstract

Agentic development workflows are distributed systems in miniature. A single run can cross planning, implementation, tests, source control, review, retries, and human checkpoints. Flat logs make it difficult to reconstruct why a run repeated work or stopped. This article presents a provider-neutral OpenTelemetry trace model for agentic workflows. A public example reads a plan–execute–review workflow specification, emits workflow, stage, and tool spans, represents review bounce-backs as repeated stage attempts, and records failures without exporting prompts, artifacts, source code, or exception messages. The example includes deterministic happy, bounce, and failure scenarios with in-memory tests and optional OTLP export.

## Reader takeaway

Readers will learn how to:

- choose workflow and stage span boundaries;
- preserve parent/child relationships through retries;
- represent bounce-backs without hiding repeated work;
- distinguish agent, tool, and human-checkpoint spans;
- define low-cardinality workflow attributes;
- test trace structure without running a collector;
- keep sensitive workflow content out of telemetry.

## Implemented trace model

```text
agentic.workflow.run
├── agentic.stage.plan
│   └── agentic.tool (repository.read)
├── agentic.stage.execute [attempt=1]
│   ├── agentic.tool (source.edit)
│   └── agentic.tool (tests.run)
├── agentic.stage.review [attempt=1, verdict=bounce]
│   └── agentic.tool (review.inspect)
├── agentic.stage.execute [attempt=2]
├── agentic.stage.review [attempt=2, verdict=approve]
└── agentic.stage.done
```

The `agentic.*` attributes are project conventions, not OpenTelemetry semantic conventions.

## Article outline

1. **Agent workflows are causal graphs, not chat transcripts**
2. **The plan–execute–review state machine**
3. **Choosing span boundaries**
   - Run, stage, tool, and checkpoint.
4. **Retries and bounce-backs**
   - Preserve attempts instead of overwriting stage state.
5. **Error semantics**
   - Record sanitized error types and span status.
6. **Privacy and cardinality**
   - Record categories and lengths, never workflow content.
7. **Testing instrumentation without infrastructure**
   - In-memory exporter and deterministic handlers.
8. **OTLP export and backend independence**
9. **What the trace can and cannot prove**
   - Diagnosis evidence versus productivity attribution.
10. **Potential semantic-convention work**
   - Areas that may benefit from community discussion without presenting custom attributes as standards.

## Evidence available

- Happy, bounce, and failure scenarios implemented.
- Nine automated tests pass across trace hierarchy, retries, failure status, privacy, exporter failure isolation, N+1 diagnosis, and Jaeger v3 summary behavior.
- Console and OTLP traces confirm one bounce and the stage sequence `plan:1 → execute:1 → review:1 → execute:2 → review:2 → done:1`.
- The pinned Collector and Jaeger 2.22 stack accepted OTLP traces and returned both workflow and performance services through the v3 query API.
- In one 20-run local guardrail check, traced and untraced medians were within 0.01 ms. The direction was inconsistent with overhead and is treated as timer noise, not as evidence of zero or negative cost.
- Production OpenTelemetry dependencies have zero known audit vulnerabilities as of 14 October 2026.

## Measurement boundary

The evaluation is a small engineering case study:

- primary observation: time to the correct diagnosis;
- guardrails: correctness, false diagnoses, tracing overhead, and export failures;
- method: repeated local runs with descriptive results;
- prohibited claim: OpenTelemetry tracing caused organization-wide productivity improvement.

## Submission status

Completed:

- full article draft and runnable public example;
- nine automated tests;
- repeated local overhead guardrail run;
- happy, bounce, and failure paths through console and OTLP exporters;
- live export through the pinned Collector to Jaeger 2.22.

Editorial and community handoffs before submission:

- confirm the final author list;
- capture sanitized trace screenshots if the editor requests them;
- ask the OpenTelemetry community whether an existing GenAI semantic convention should replace any custom attribute;
- complete external review and copy the approved draft to the public Google Doc used for submission.
