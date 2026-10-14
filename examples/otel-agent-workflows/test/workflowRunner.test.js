'use strict';

const path = require('path');
const { InMemorySpanExporter } = require('@opentelemetry/sdk-trace-base');
const { createTelemetry } = require('../src/telemetry');
const { createDemoHandlers } = require('../src/demoHandlers');
const { runWorkflow } = require('../src/workflowRunner');

const spec = require(path.resolve(__dirname, '../../../workflows/plan-execute-review.json'));

async function runScenario(mode) {
  const exporter = new InMemorySpanExporter();
  const telemetry = createTelemetry({ exporter, serviceName: 'workflow-test' });
  try {
    const result = await runWorkflow({
      spec,
      handlers: createDemoHandlers(mode),
      telemetry,
      runId: `test-${mode}`,
    });
    await telemetry.provider.forceFlush();
    return { result, spans: exporter.getFinishedSpans() };
  } finally {
    await telemetry.shutdown();
  }
}

describe('runWorkflow telemetry', () => {
  test('emits one workflow span with stage and tool children', async () => {
    const { result, spans } = await runScenario('happy');
    const names = spans.map((span) => span.name);

    expect(result.outcome).toBe('complete');
    expect(result.bounceCount).toBe(0);
    expect(names.filter((name) => name === 'agentic.workflow.run')).toHaveLength(1);
    expect(names).toEqual(expect.arrayContaining([
      'agentic.stage.plan',
      'agentic.stage.execute',
      'agentic.stage.review',
      'agentic.stage.done',
      'agentic.tool',
    ]));

    const workflowSpan = spans.find((span) => span.name === 'agentic.workflow.run');
    const stageSpans = spans.filter((span) => span.name.startsWith('agentic.stage.'));
    for (const stageSpan of stageSpans) {
      expect(stageSpan.parentSpanContext.spanId).toBe(workflowSpan.spanContext().spanId);
    }
  });

  test('records bounce attempts without exporting artifact content', async () => {
    const { result, spans } = await runScenario('bounce');
    const executeSpans = spans.filter((span) => span.name === 'agentic.stage.execute');
    const reviewSpans = spans.filter((span) => span.name === 'agentic.stage.review');
    const serialized = JSON.stringify(spans.map((span) => span.attributes));

    expect(result.outcome).toBe('complete');
    expect(result.bounceCount).toBe(1);
    expect(executeSpans).toHaveLength(2);
    expect(reviewSpans).toHaveLength(2);
    expect(executeSpans.map((span) => span.attributes['agentic.stage.attempt'])).toEqual([1, 2]);
    expect(serialized).not.toContain('MUST_FIX');
    expect(serialized).not.toContain('# Plan');
  });

  test('marks workflow and tool failures without exporting exception messages', async () => {
    const exporter = new InMemorySpanExporter();
    const telemetry = createTelemetry({ exporter, serviceName: 'workflow-test' });

    await expect(runWorkflow({
      spec,
      handlers: createDemoHandlers('error'),
      telemetry,
      runId: 'test-error',
    })).rejects.toMatchObject({ name: 'TestCommandError' });
    await telemetry.provider.forceFlush();

    const spans = exporter.getFinishedSpans();
    const workflowSpan = spans.find((span) => span.name === 'agentic.workflow.run');
    const serialized = JSON.stringify(spans.map((span) => span.attributes));

    expect(workflowSpan.attributes['agentic.workflow.outcome']).toBe('failed');
    expect(workflowSpan.attributes['error.type']).toBe('TestCommandError');
    expect(serialized).not.toContain('deterministic test command failed');
    await telemetry.shutdown();
  });

  test('keeps exporter failure separate from the workflow result', async () => {
    const diagnostics = [];
    const exporter = {
      export(_spans, callback) {
        callback({ code: 1, error: new Error('collector rejected secret-value') });
      },
      shutdown() {
        return Promise.resolve();
      },
    };
    const telemetry = createTelemetry({
      exporter,
      batch: true,
      serviceName: 'workflow-export-failure-test',
      onExportError: (diagnostic) => diagnostics.push(diagnostic),
    });

    const result = await runWorkflow({
      spec,
      handlers: createDemoHandlers('happy'),
      telemetry,
      runId: 'test-export-failure',
    });
    const shutdown = await telemetry.shutdown();

    expect(result.outcome).toBe('complete');
    expect(shutdown.ok).toBe(false);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.every((diagnostic) => diagnostic.errorType === 'Error')).toBe(true);
    expect(JSON.stringify({ diagnostics, shutdown })).not.toContain('secret-value');
  });
});
