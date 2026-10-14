# Tests Passed. The Trace Still Found an N+1 Query.

**Author:** Prasanna Bableshwar  
**CNCF projects:** OpenTelemetry, Jaeger  
**Format:** Tutorial / architecture lesson

A coding agent can return a correct patch that is still too slow to ship. Tests may confirm the response body and edge cases while missing twelve sequential database calls hidden behind one request.

This tutorial uses OpenTelemetry to give a coding agent a narrow diagnostic tool. The agent can see request duration, repeated child-span counts, and a trace ID. It cannot issue arbitrary backend queries or read prompts, source code, artifacts, user identifiers, or exception messages from telemetry.

The example is intentionally small and deterministic. It does not call a model API. That makes the tracing behavior easy to inspect and the before-and-after workload easy to repeat.

## The blind spot after tests pass

Consider an order endpoint that returns twelve orders and their owners. Both implementations below return the same data:

```javascript
if (mode === 'batch') {
  const users = await lookupUsers(
    orders.map((order) => order.userId),
    requestSpan,
  );
  return orders.map((order) => ({
    ...order,
    user: users.get(order.userId),
  }));
}

const results = [];
for (const order of orders) {
  const user = await lookupUser(order.userId, requestSpan);
  results.push({ ...order, user });
}
return results;
```

A functional test sees equivalent results. A trace sees two different execution shapes:

```text
demo.orders.list                  demo.orders.list
├── demo.db.user_lookup           └── demo.db.user_batch_lookup
├── demo.db.user_lookup
├── ... repeated 12 times
└── demo.db.user_lookup
```

The left-hand request waits for twelve sequential lookups. The right-hand request performs one batch lookup. The repeated child spans make the problem visible without recording query text, order data, or user IDs.

## A local, vendor-neutral trace path

The runnable example supports three exporters:

- an in-memory exporter for tests and local diagnosis;
- a console exporter for inspecting individual spans;
- OTLP/HTTP for an OpenTelemetry Collector and Jaeger.

The Docker-backed path is:

```text
Node.js example
    │ OTLP/HTTP
    ▼
OpenTelemetry Collector
    │ OTLP
    ▼
Jaeger
```

The diagnostic path does not depend on Jaeger. The in-memory exporter exercises the same instrumentation and is useful in CI or on a laptop without Docker.

Install and run it from the repository root:

```bash
cd examples/otel-agent-workflows
npm install
npm test
npm run diagnose:local
```

To inspect OTLP traces, start the local stack and run both workloads:

```bash
docker compose up -d
npm run performance:nplus1
npm run performance:batch
npm run traces:summary
```

The Collector listens on `http://localhost:4318`; the Jaeger UI is available on `http://localhost:16686`.

## Give the agent a bounded diagnostic command

Letting an agent send arbitrary queries to an observability backend creates unnecessary risk. Backend access can expose unrelated services, high-cardinality fields, customer data, or expensive queries.

The example instead provides `summarize-jaeger.js`. It queries a fixed local service and returns a small report:

- request count;
- median and p95 request duration;
- median lookup-span count;
- trace IDs for the matching requests.

The Docker-free command returns the same class of report from the in-memory exporter:

```json
{
  "scenario": "seeded-n-plus-one",
  "runsPerMode": 10,
  "diagnosis": "Repeated demo.db.user_lookup child spans identify the N+1 path; one demo.db.user_batch_lookup span verifies the fix.",
  "report": {
    "nplus1": {
      "traceCount": 10,
      "medianDurationMs": 102.35,
      "p95DurationMs": 108.53,
      "medianLookupSpanCount": 12
    },
    "batch": {
      "traceCount": 10,
      "medianDurationMs": 9.05,
      "p95DurationMs": 9.10,
      "medianLookupSpanCount": 1
    }
  }
}
```

These figures came from a 10-run local comparison on 14 October 2026, after two warm-up runs per mode. The service uses an artificial 8 ms delay per lookup, so the numbers are demonstration evidence, not a production benchmark. A separate Collector-to-Jaeger run reproduced the trace shape through Jaeger's v3 query API. The bounded summary returned six traces per mode, including one warm-up trace, with median lookup-span counts of twelve for the N+1 path and one for the batch path.

A coding agent can use that signal in a controlled loop:

1. run the functional tests;
2. run the seeded workload;
3. read the bounded trace summary;
4. identify repeated dependency spans;
5. change the implementation;
6. run the same tests and workload again;
7. verify both the result and the trace shape.

The trace does not tell the agent which patch to make. It gives the agent evidence that the current path repeats work and a way to confirm that a proposed fix removed the repetition.

## Keep content out of spans

Observability data often outlives the process that emitted it and may be visible to more people than application data. Instrumentation for coding agents should assume prompts and artifacts are sensitive.

This example records stable categories and counts:

```javascript
return telemetry.inSpan(
  'demo.db.user_lookup',
  {
    'db.operation.name': 'select',
    'db.collection.name': 'users',
    'demo.lookup.cardinality': 'single',
  },
  parentSpan,
  operation,
);
```

It does not record:

- prompt or response content;
- source code or diffs;
- artifact bodies;
- credentials, emails, or user names;
- user-supplied file paths;
- exception messages;
- natural-language task descriptions.

A real service should also review attribute cardinality, retention, sampling, access controls, and backend redaction. The example's privacy contract is a starting point, not a substitute for that review.

## Test telemetry like application behavior

The test suite uses OpenTelemetry's in-memory exporter. It asserts both application results and the spans produced by each path. The N+1 test expects twelve `demo.db.user_lookup` children. The batch test expects one `demo.db.user_batch_lookup` child.

This catches two failure classes:

1. a code change reintroduces repeated calls;
2. an instrumentation change hides or mislabels the calls.

Tests should also assert that forbidden content never appears in span attributes. Privacy rules are easier to maintain when they fail in CI instead of relying on reviewers to inspect every new attribute.

## Measure tracing cost separately

The repository includes a small traced-versus-untraced workflow check:

```bash
npm run measure:overhead
```

In one 20-run local sample, the traced and untraced medians differed by 0.01 ms, with the traced path appearing faster. That direction is timer noise, not evidence that tracing has negative or zero cost.

Measure overhead on the target runtime with the intended processor, exporter, sampling policy, workload, and network path. A local in-memory run cannot set a production overhead budget.

## What this example establishes

The example establishes that a small, content-free trace model can expose repeated dependency calls and verify their removal. It also shows how to constrain the diagnostic surface presented to a coding agent.

It does not establish that OpenTelemetry improves engineering productivity, that agents will diagnose every performance problem, or that the measured timings apply outside this artificial workload.

The next useful extensions are queue delay, retry storms, memory and garbage-collection pressure, and slow tool calls. Each needs the same discipline: seed a reproducible failure, expose only the minimum diagnostic signal, and verify the fix against the same workload.

## Try the example

The complete source, tests, Collector configuration, and Jaeger setup are under [`examples/otel-agent-workflows`](../../examples/otel-agent-workflows/). The trace and privacy decisions are documented in [ADR-011](../adr/ADR-011-opentelemetry-workflow-tracing.md).
