'use strict';

const { InMemorySpanExporter } = require('@opentelemetry/sdk-trace-base');
const { createTelemetry } = require('../src/telemetry');
const { createOrderService } = require('../src/orderService');
const { summarizePerformanceSpans } = require('../src/performanceSummary');

test('summarizes the diagnostic signal without span content', async () => {
  const exporter = new InMemorySpanExporter();
  const telemetry = createTelemetry({ exporter, serviceName: 'summary-test' });
  try {
    const service = createOrderService({ telemetry, orderCount: 4, queryDelayMs: 1 });
    await service.listOrders('nplus1');
    await service.listOrders('batch');
    await telemetry.provider.forceFlush();

    const report = summarizePerformanceSpans(exporter.getFinishedSpans());
    expect(report.nplus1.traceCount).toBe(1);
    expect(report.nplus1.medianLookupSpanCount).toBe(4);
    expect(report.batch.traceCount).toBe(1);
    expect(report.batch.medianLookupSpanCount).toBe(1);
  } finally {
    await telemetry.shutdown();
  }
});
