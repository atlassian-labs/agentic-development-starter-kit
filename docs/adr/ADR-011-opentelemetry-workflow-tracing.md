# ADR-011 — OpenTelemetry Tracing for Agentic Workflows

**Status:** PROPOSED  
**Date:** 2026-10-14  
**Applies to:** Agentic workflow runtimes based on the starter-kit workflow specifications

---

## Context

The starter kit defines multi-stage workflows such as `plan → execute → review`, but it does not prescribe a runtime. When a workflow stalls, repeats a stage, calls the wrong tool, or waits at a checkpoint, logs do not reliably preserve the causal path across those operations.

OpenTelemetry can represent that path without coupling the template to a model provider or observability backend. The public repository needs a runnable example, not a copy of a private workflow engine.

## Decision

Add a self-contained example under `examples/otel-agent-workflows/` that reads the existing workflow JSON and emits OpenTelemetry traces.

The trace hierarchy is:

```text
agentic.workflow.run
├── agentic.stage.plan
├── agentic.stage.execute
│   ├── agentic.tool.test
│   └── agentic.tool.source-control
├── agentic.stage.review
└── agentic.checkpoint.human-review
```

### Attribute contract

Use low-cardinality `agentic.*` attributes:

| Attribute | Purpose |
|---|---|
| `agentic.workflow.key` | Stable workflow definition key |
| `agentic.workflow.run_id` | Caller-provided run identifier |
| `agentic.workflow.outcome` | `complete`, `failed`, or `escalated` |
| `agentic.stage.key` | Stable stage key |
| `agentic.stage.index` | Position in the workflow |
| `agentic.stage.attempt` | Attempt number for the stage |
| `agentic.stage.outcome` | `complete`, `bounce`, `failed`, or `skipped` |
| `agentic.agent.role` | Planner, coder, reviewer, or another declared role |
| `agentic.prompt.mode` | Workflow prompt mode, such as `replace` |
| `agentic.output.format` | Declared artifact format |
| `agentic.output.size` | Output length in characters |
| `agentic.review.verdict` | `approve`, `bounce`, or `escalate` |
| `agentic.bounce.count` | Number of bounce-backs in the run |
| `agentic.tool.name` | Stable tool category, not a command containing user data |
| `agentic.tool.outcome` | `complete` or `failed` |

### Privacy and cardinality rules

The instrumentation MUST NOT export:

- prompt or response content;
- source code or diffs;
- artifact bodies;
- credentials, tokens, emails, or user names;
- file paths supplied by users;
- exception messages that may contain sensitive data;
- unbounded issue titles or natural-language task descriptions.

Record lengths, stable categories, status values, and sanitized exception types instead.

### Export behavior

- Tests use an in-memory exporter and require no collector.
- The runnable example supports OTLP/HTTP and console export.
- Export or shutdown failure must not change the workflow result; callers receive a sanitized diagnostic containing only the failed phase and error type.
- Tracing can be disabled with configuration.

## Alternatives considered

### Add tracing to the private workflow runtime

Rejected for this repository. The public starter kit does not contain that runtime, and recreating its classes would publish a misleading example.

### Log workflow events as JSON

Useful for local debugging but insufficient for parent/child timing, causal relationships, and backend-neutral export.

### Adopt a model-provider-specific tracing SDK

Rejected. The starter kit is provider-neutral, and the CNCF article requires an OpenTelemetry-centered example.

## Consequences

**Positive**

- Workflow timing, retries, tool calls, and checkpoints become visible in one trace.
- The example works with any OTLP-compatible backend.
- The implementation is useful without an LLM or proprietary platform.
- Tests can assert trace structure deterministically.

**Negative**

- Custom `agentic.*` attributes are project conventions, not OpenTelemetry semantic conventions.
- Instrumentation adds runtime and maintenance overhead.
- A tutorial run cannot establish causal productivity improvement.

## Evaluation

Use a reproducible seeded scenario and report descriptive results only.

- **Primary observation:** time to correct diagnosis.
- **Guardrails:** correct diagnosis, false diagnoses, tracing overhead, and export failures.
- **Method:** repeated local case-study runs. Do not claim the instrumentation caused a general productivity improvement.

The selected metrics are example-specific and are not presented as industry standards.

## Related ADRs

- ADR-001 — Session Architecture
- ADR-008 — Agent Output Truncation
- ADR-009 — Human Checkpoint Approval
- ADR-010 — PII and Data Privacy Handling
