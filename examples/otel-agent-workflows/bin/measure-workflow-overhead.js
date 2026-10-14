#!/usr/bin/env node
'use strict';

const { performance } = require('perf_hooks');
const { InMemorySpanExporter } = require('@opentelemetry/sdk-trace-base');
const spec = require('../../../workflows/plan-execute-review.json');
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

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
}

async function measure(enabled, runs, warmupRuns) {
  const exporter = enabled ? new InMemorySpanExporter() : undefined;
  const telemetry = createTelemetry({ enabled, exporter, serviceName: 'workflow-overhead-example' });
  const durations = [];
  try {
    for (let index = 0; index < warmupRuns + runs; index += 1) {
      const started = performance.now();
      await runWorkflow({
        spec,
        handlers: createDemoHandlers('happy'),
        telemetry,
        runId: `overhead-${enabled ? 'on' : 'off'}-${index}`,
      });
      const duration = performance.now() - started;
      if (index >= warmupRuns) {
        durations.push(Number(duration.toFixed(2)));
      }
    }
    return {
      medianMs: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
      durationsMs: durations,
    };
  } finally {
    await telemetry.shutdown();
  }
}

async function main() {
  const runs = Number(readArgument('runs', '20'));
  const warmupRuns = Number(readArgument('warmup', '3'));
  const withoutTracing = await measure(false, runs, warmupRuns);
  const withTracing = await measure(true, runs, warmupRuns);
  const deltaMs = Number((withTracing.medianMs - withoutTracing.medianMs).toFixed(2));
  const deltaPercent = Number(((deltaMs / withoutTracing.medianMs) * 100).toFixed(2));

  process.stdout.write(`${JSON.stringify({
    runs,
    warmupRuns,
    withoutTracing,
    withTracing,
    medianOverheadMs: deltaMs,
    medianOverheadPercent: deltaPercent,
    caveat: 'Local deterministic measurement only; repeat on the target runtime before setting an overhead budget.',
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Overhead measurement failed (${error.name || 'Error'}).\n`);
  process.exitCode = 1;
});
