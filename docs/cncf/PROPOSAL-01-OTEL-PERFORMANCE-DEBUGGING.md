# CNCF Proposal 1 — Teaching Coding Agents to Debug Performance with OpenTelemetry

## Submission type

Tutorial / architecture lesson

## CNCF projects

- OpenTelemetry
- Jaeger

## Proposed title

**Teaching Coding Agents to Debug Performance with OpenTelemetry**

Alternative: **Tests Tell an Agent What Broke; Traces Show Why It Is Slow**

## Authors

- Prasanna Bableshwar
- Proposed co-author: Anand Shastri

## Abstract

Coding agents can make tests pass while introducing slow dependency chains, repeated queries, or other operational regressions. This tutorial shows how to give an agent a bounded OpenTelemetry diagnostic path instead of unrestricted access to an observability backend. A reproducible Node.js example emits OTLP traces for a seeded N+1 lookup, summarizes only request duration and child-span counts, and verifies a batch-query fix against the same workload. The design keeps prompts, source code, artifacts, and user data out of telemetry. Readers can run the example with an in-memory exporter or inspect the traces through an OpenTelemetry Collector and Jaeger.

## Reader takeaway

Readers will leave with:

- a trace model that makes repeated dependency calls visible;
- a bounded command suitable for coding-agent tool use;
- a before/after verification loop;
- privacy and cardinality rules for agent-accessible telemetry;
- a public example that works without a model API.

## Evidence available

A local deterministic run on 14 October 2026 produced:

| Path | Traces | Median duration | p95 duration | Median lookup spans |
|---|---:|---:|---:|---:|
| Seeded N+1 | 10 | 102.35 ms | 108.53 ms | 12 |
| Batch lookup | 10 | 9.05 ms | 9.10 ms | 1 |

This is demonstration evidence from an artificial delay, not a production benchmark or a general claim about agent productivity.

## Article outline

1. **The blind spot after tests pass**
   - Functional correctness does not expose N+1 calls or slow dependencies.
2. **Why an unrestricted observability tool is the wrong answer**
   - Data exposure, high-cardinality queries, and unpredictable agent behavior.
3. **The local trace architecture**
   - Application → OTLP/HTTP → OpenTelemetry Collector → Jaeger.
4. **The seeded failure**
   - One request span with twelve sequential user lookup spans.
5. **The bounded diagnostic interface**
   - Return durations, child-span counts, operation categories, and a trace ID.
6. **The fix**
   - Replace twelve lookups with one batch lookup.
7. **Verification**
   - Re-run the same workload and compare both trace shape and duration.
8. **Privacy and safety**
   - No prompts, code, artifacts, identifiers, or exception messages in span attributes.
9. **Where to go next**
   - Memory/GC, retries, queue latency, and tool-call regressions.

## Figures

1. Local Collector and Jaeger architecture.
2. N+1 trace tree versus batch trace tree.
3. Bounded agent diagnostic loop.
4. Small before/after results table with the demonstration caveat.

## Submission status

Completed:

- full article draft and runnable public example;
- nine automated tests;
- repeated local diagnosis and overhead guardrail runs;
- OTLP/HTTP export through the pinned Collector to Jaeger 2.22;
- bounded trace summary through Jaeger's v3 query API.

Editorial handoffs before submission:

- confirm the final author list;
- capture a sanitized Jaeger screenshot if the editor requests one;
- complete the repository's external-share review;
- copy the approved draft to the public Google Doc used for submission.
