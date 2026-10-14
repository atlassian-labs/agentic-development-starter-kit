#!/usr/bin/env node
'use strict';

const path = require('path');
const { createTelemetry } = require('../src/telemetry');
const { createDemoHandlers } = require('../src/demoHandlers');
const { runWorkflow } = require('../src/workflowRunner');

function readArgument(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((argument) => argument.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

async function main() {
  const mode = readArgument('mode', 'happy');
  const exporterType = readArgument('exporter', process.env.TRACE_EXPORTER || 'otlp');
  const workflowPath = path.resolve(
    __dirname,
    readArgument('workflow', '../../../workflows/plan-execute-review.json'),
  );
  const spec = require(workflowPath);
  const telemetry = createTelemetry({
    exporterType,
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    serviceName: process.env.OTEL_SERVICE_NAME || 'agentic-workflow-example',
    batch: exporterType === 'otlp',
  });

  try {
    const result = await runWorkflow({
      spec,
      handlers: createDemoHandlers(mode),
      telemetry,
      runId: process.env.WORKFLOW_RUN_ID || `demo-${mode}`,
    });
    process.stdout.write(`${JSON.stringify({
      runId: result.runId,
      workflowKey: result.workflowKey,
      outcome: result.outcome,
      bounceCount: result.bounceCount,
      stageHistory: result.stageHistory,
    }, null, 2)}\n`);
  } finally {
    await telemetry.shutdown();
  }
}

main().catch((error) => {
  process.stderr.write(`Workflow failed (${error.name || 'Error'}).\n`);
  process.exitCode = 1;
});
