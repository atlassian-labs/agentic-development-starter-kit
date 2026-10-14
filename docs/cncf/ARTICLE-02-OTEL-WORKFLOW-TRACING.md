# Tracing Plan, Execute, and Review Agent Workflows with OpenTelemetry

**Author:** Prasanna Bableshwar  
**CNCF project:** OpenTelemetry  
**Format:** Case study / implementation guide

A multi-stage agent run is easier to debug as a causal graph than as a chat transcript. One run may cycle through planning, implementation, testing, review, and human approval. A flat log can list those events, but it does not reliably preserve their parent-child relationships, timing, or repeated attempts.

This article presents a small OpenTelemetry trace model for a `plan → execute → review` workflow. It keeps each run in one trace, records retries and review bounce-backs as separate stage spans, and excludes prompt and artifact content.

The trace model is independent of the model provider and OTLP backend. The local demonstration uses Jaeger for inspection and deterministic handlers instead of an LLM, so readers can inspect the trace structure without credentials or model variability.

## Model the state machine before adding spans

The example reads a workflow specification rather than hard-coding a single execution path. Each stage has a stable key and may declare an agent role, output format, human checkpoint, or bounce target.

A happy path produces:

```text
plan:1 → execute:1 → review:1 → done:1
```

A review bounce produces:

```text
plan:1 → execute:1 → review:1 (bounce)
       → execute:2 → review:2 (approve) → done:1
```

The second sequence matters. If instrumentation updates one mutable “execute” record, the trace hides the repeated work. The example emits one span per attempt instead.

## Choose four useful boundaries

The model uses four conceptual span boundaries.

### Workflow run

`agentic.workflow.run` is the root span. It carries a stable workflow key, a caller-provided run ID, the final outcome, and the number of review bounces.

### Stage attempt

Each stage attempt is a direct child of the workflow span:

```text
agentic.stage.plan
agentic.stage.execute
agentic.stage.review
agentic.stage.done
```

The stage span records the stage key, index, attempt number, declared agent role, and outcome. A second execution attempt is a second span with `agentic.stage.attempt=2`.

### Tool call

Tool spans are children of the stage that invoked them. The example records stable categories such as `repository.read`, `source.edit`, `tests.run`, and `review.inspect`. It does not store commands, file paths, code, or tool output.

### Human checkpoint

A stage may declare `agentic.checkpoint.human=true`. The current example records that property on the stage span. A runtime with a long asynchronous approval could use a separate checkpoint span or a span link, depending on whether it keeps the original trace context alive.

The resulting bounce trace is:

```text
agentic.workflow.run
├── agentic.stage.plan [attempt=1]
│   └── agentic.tool [repository.read]
├── agentic.stage.execute [attempt=1]
│   ├── agentic.tool [source.edit]
│   └── agentic.tool [tests.run]
├── agentic.stage.review [attempt=1, verdict=bounce]
│   └── agentic.tool [review.inspect]
├── agentic.stage.execute [attempt=2]
├── agentic.stage.review [attempt=2, verdict=approve]
└── agentic.stage.done [attempt=1]
```

## Preserve attempts and bounce events

The runner keeps an attempt counter per stage. When review returns `bounce`, it adds a workflow event and moves back to the declared target stage:

```javascript
if (verdict === 'bounce') {
  bounceCount += 1;
  workflowSpan.addEvent('agentic.workflow.bounce', {
    'agentic.bounce.count': bounceCount,
    'agentic.bounce.from_stage': stage.key,
    'agentic.bounce.target_stage': stage.bounce_target,
  });
  index = stageIndexes.get(stage.bounce_target);
  continue;
}
```

The trace now answers concrete questions:

- Which stage requested the bounce?
- Which stage ran again?
- How many attempts occurred?
- Which tools ran on each attempt?
- Where did the elapsed time accumulate?

The runner enforces a bounce limit. Exceeding it changes the workflow outcome to `escalated`, preventing an unbounded loop.

## Mark failures without copying exception messages

A thrown error marks both the active span and workflow span with OpenTelemetry error status. The example records only the error type:

```javascript
span.setAttribute(
  'error.type',
  error && error.name ? error.name : 'Error',
);
span.setStatus({ code: SpanStatusCode.ERROR });
```

Exception messages can contain code, paths, request values, or credentials. Omitting them reduces the chance that a useful trace becomes a second store for sensitive workflow content.

The example rethrows the original error after marking the span. Instrumentation observes control flow; it does not replace application error handling.

## Conventions, not standards

The example uses project-defined `agentic.*` attributes:

| Attribute | Meaning |
|---|---|
| `agentic.workflow.key` | Stable workflow definition key |
| `agentic.workflow.outcome` | `complete`, `failed`, or `escalated` |
| `agentic.stage.key` | Stable stage key |
| `agentic.stage.attempt` | Attempt number for that stage |
| `agentic.stage.outcome` | `complete`, `bounce`, `failed`, or `skipped` |
| `agentic.review.verdict` | `approve`, `bounce`, or `escalate` |
| `agentic.bounce.count` | Bounce-backs in the run |
| `agentic.tool.name` | Stable tool category |
| `agentic.tool.outcome` | `complete` or `failed` |

These names are not OpenTelemetry semantic conventions and should not be presented as such. They document one implementation's contract. Teams adopting the model should first check current OpenTelemetry semantic conventions, then keep any custom namespace small, stable, and low-cardinality.

## Record shape, status, and size, not content

The instrumentation records declared format and output length, but not the output itself:

```javascript
stageSpan.setAttribute(
  'agentic.output.size',
  textSize(normalized.artifact),
);
```

The privacy contract prohibits:

- prompts and model responses;
- source code and diffs;
- artifact bodies;
- credentials and personal identifiers;
- user-supplied paths;
- exception messages;
- issue titles and free-form task descriptions.

Stable categories make aggregation possible. Free-form content raises both disclosure and cardinality risk.

## Test trace structure without a collector

The automated tests use `InMemorySpanExporter`. They run the workflow, flush the provider, and assert the finished spans.

The suite verifies:

- one root workflow span;
- stage spans parented to the root;
- tool spans parented to the correct stage;
- the exact bounce sequence and attempt numbers;
- error status and sanitized error type;
- absence of a sensitive marker from serialized span data.

Run it with:

```bash
cd examples/otel-agent-workflows
npm install
npm test
```

The current suite contains nine passing tests across workflow tracing, exporter failure isolation, performance diagnosis, and Jaeger v3 summary parsing. Docker is not required.

Console export makes the three workflow paths easy to inspect:

```bash
npm run demo:happy
npm run demo:bounce
npm run demo:error
```

For an OTLP-compatible backend:

```bash
docker compose up -d
node bin/run-workflow.js --mode bounce --exporter otlp
```

The included local stack sends OTLP/HTTP data through an OpenTelemetry Collector to Jaeger. The tracing code remains independent of the backend.

## Treat exporter failure as an observability problem

Tracing should not decide whether the workflow succeeds. The example lets the workflow run with tracing disabled and isolates exporter shutdown from workflow logic. Shutdown returns a sanitized status with the failed phase and error type, and callers may register an `onExportError` callback. It does not copy the exporter error message into that diagnostic. A production runtime also needs explicit handling for queue limits, export timeouts, dropped spans, and process shutdown.

That does not mean export failure should be silent. Monitor the telemetry pipeline separately and decide whether missing traces block a regulated or audited workflow. The application outcome and the observability outcome are related but distinct.

## Measure overhead on the target runtime

The repository includes a repeated local comparison:

```bash
npm run measure:overhead
```

One 20-run sample reported 40.77 ms without tracing and 40.76 ms with in-memory tracing, a difference of -0.01 ms. The traced path did not become faster because spans were added. The result shows that this small sample cannot separate instrumentation cost from timer noise.

Use the intended processor, exporter, sampling policy, runtime, and workload before setting an overhead budget. Report the distribution and environment, not a single favorable number.

## What the trace can answer

For this example, the trace can show:

- the path taken through the workflow;
- stage and tool duration;
- attempt and bounce counts;
- the stage where a failure surfaced;
- whether a human checkpoint was declared;
- whether expected spans were emitted.

It cannot prove that the agent made a good plan, that the review verdict was correct, or that tracing improved team productivity. Those questions require separate evaluation.

The design is useful because it turns an otherwise fragmented run into a testable causal record while keeping workflow content outside the telemetry stream.

## Try the example

The runnable source, tests, Collector configuration, and Jaeger setup are under [`examples/otel-agent-workflows`](../../examples/otel-agent-workflows/). The full attribute and privacy contract is in [ADR-011](../adr/ADR-011-opentelemetry-workflow-tracing.md).
