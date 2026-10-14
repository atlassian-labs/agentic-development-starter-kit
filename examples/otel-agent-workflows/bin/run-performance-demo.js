#!/usr/bin/env node
'use strict';

const { performance } = require('perf_hooks');
const { createTelemetry } = require('../src/telemetry');
const { createOrderService } = require('../src/orderService');

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

async function main() {
  const mode = readArgument('mode', 'nplus1');
  const exporterType = readArgument('exporter', process.env.TRACE_EXPORTER || 'otlp');
  const runs = Number(readArgument('runs', '10'));
  const warmupRuns = Number(readArgument('warmup', '2'));
  if (!Number.isInteger(runs) || runs < 1 || !Number.isInteger(warmupRuns) || warmupRuns < 0) {
    throw new Error('runs must be positive and warmup must be zero or positive');
  }

  const telemetry = createTelemetry({
    exporterType,
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    serviceName: process.env.OTEL_SERVICE_NAME || 'agentic-performance-example',
    batch: exporterType === 'otlp',
  });
  const service = createOrderService({ telemetry });
  const durations = [];

  try {
    for (let index = 0; index < warmupRuns + runs; index += 1) {
      const started = performance.now();
      await service.listOrders(mode);
      const duration = performance.now() - started;
      if (index >= warmupRuns) {
        durations.push(Number(duration.toFixed(2)));
      }
    }

    process.stdout.write(`${JSON.stringify({
      mode,
      runs,
      warmupRuns,
      medianMs: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
      minMs: Math.min(...durations),
      maxMs: Math.max(...durations),
      durationsMs: durations,
    }, null, 2)}\n`);
  } finally {
    await telemetry.shutdown();
  }
}

main().catch((error) => {
  process.stderr.write(`Performance demo failed (${error.name || 'Error'}).\n`);
  process.exitCode = 1;
});
