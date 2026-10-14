# OpenTelemetry for Agentic Workflows

This vendor-neutral example supports two uses:

1. trace a `plan → execute → review` agent workflow, including bounce-backs and tool failures;
2. diagnose and verify a seeded N+1 performance problem using OpenTelemetry traces.

It does not call an LLM. Deterministic handlers keep the example reproducible and isolate the tracing behavior from model variability.

## Requirements

- Node.js 18 or newer
- npm
- Docker with Compose, for the OTLP and Jaeger demonstration

## Install and test

```bash
cd examples/otel-agent-workflows
npm install
npm test
```

The tests use OpenTelemetry's in-memory exporter. Docker is not required.

Programmatic callers can pass `enabled: false` to `createTelemetry()` to run without spans. `telemetry.shutdown()` returns a sanitized status instead of failing the workflow when export or shutdown fails; use `onExportError` to connect that signal to a logger or metric.

## Trace an agentic workflow

Console export:

```bash
npm run demo:happy
npm run demo:bounce
npm run demo:error
```

The bounce scenario produces this stage history:

```text
plan:1 → execute:1 → review:1 (bounce) → execute:2 → review:2 → done:1
```

The trace contains workflow, stage, and tool spans. It contains lengths and stable status categories, not prompts, source code, artifacts, user identifiers, or exception messages.

## Run the diagnostic without Docker

The in-memory exporter exercises the same spans and prints a bounded before/after report:

```bash
npm run diagnose:local
```

Use this command in tests, CI, or environments where Docker is unavailable.

## Start the local trace stack

```bash
docker compose up -d
```

The stack uses:

- OpenTelemetry Collector on `http://localhost:4318`;
- Jaeger UI on `http://localhost:16686`.

Run an OTLP workflow trace:

```bash
node bin/run-workflow.js --mode bounce --exporter otlp
```

Search for service `agentic-workflow-example` in Jaeger.

## Diagnose the N+1 scenario

Run the same workload with sequential per-order lookups and with one batch lookup:

```bash
npm run performance:nplus1
npm run performance:batch
npm run traces:summary
```

Expected trace shape:

```text
demo.orders.list                  demo.orders.list
├── demo.db.user_lookup           └── demo.db.user_batch_lookup
├── demo.db.user_lookup
├── ... repeated 12 times
└── demo.db.user_lookup
```

`summarize-jaeger.js` is a bounded diagnostic command. It returns request duration and lookup-span counts, not span bodies or arbitrary backend queries. A coding agent can use this output to identify the repeated lookup and verify that the batch path removes it.

## Run a repeatable local comparison

Both performance commands discard warm-up runs and report every measured duration plus median and p95:

```bash
node bin/run-performance-demo.js --mode nplus1 --runs 20 --warmup 3 --exporter otlp
node bin/run-performance-demo.js --mode batch --runs 20 --warmup 3 --exporter otlp
```

Treat the results as a local case study. They do not establish a general productivity effect.

Measure traced and untraced workflow runs separately:

```bash
npm run measure:overhead
```

At this demo scale, small differences are usually timer noise. Repeat on the target runtime before setting an overhead budget.

## Attribute conventions

The example uses project-defined `agentic.*` attributes. They are not OpenTelemetry semantic conventions. See [ADR-011](../../docs/adr/ADR-011-opentelemetry-workflow-tracing.md) for the contract and privacy rules.

## Stop the stack

```bash
docker compose down
```
