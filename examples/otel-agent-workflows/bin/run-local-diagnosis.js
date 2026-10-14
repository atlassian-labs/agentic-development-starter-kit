#!/usr/bin/env node
'use strict';

const { InMemorySpanExporter } = require('@opentelemetry/sdk-trace-base');
const { createTelemetry } = require('../src/telemetry');
const { createOrderService } = require('../src/orderService');
const { summarizePerformanceSpans } = require('../src/performanceSummary');

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
  const runs = Number(readArgument('runs', '10'));
  const warmupRuns = Number(readArgument('warmup', '2'));
  if (!Number.isInteger(runs) || runs < 1 || !Number.isInteger(warmupRuns) || warmupRuns < 0) {
    throw new Error('runs must be positive and warmup must be zero or positive');
  }

  const exporter = new InMemorySpanExporter();
  const telemetry = createTelemetry({ exporter, serviceName: 'agentic-performance-example' });
  const service = createOrderService({ telemetry });

  try {
    for (const mode of ['nplus1', 'batch']) {
      for (let index = 0; index < warmupRuns; index += 1) {
        await service.listOrders(mode);
      }
    }
    await telemetry.provider.forceFlush();
    exporter.reset();

    for (const mode of ['nplus1', 'batch']) {
      for (let index = 0; index < runs; index += 1) {
        await service.listOrders(mode);
      }
    }
    await telemetry.provider.forceFlush();

    const report = summarizePerformanceSpans(exporter.getFinishedSpans());
    process.stdout.write(`${JSON.stringify({
      scenario: 'seeded-n-plus-one',
      runsPerMode: runs,
      warmupRunsPerMode: warmupRuns,
      diagnosis: 'Repeated demo.db.user_lookup child spans identify the N+1 path; one demo.db.user_batch_lookup span verifies the fix.',
      report,
    }, null, 2)}\n`);
  } finally {
    await telemetry.shutdown();
  }
}

main().catch((error) => {
  process.stderr.write(`Local diagnosis failed (${error.name || 'Error'}).\n`);
  process.exitCode = 1;
});
