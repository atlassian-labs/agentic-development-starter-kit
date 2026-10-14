'use strict';

const { InMemorySpanExporter } = require('@opentelemetry/sdk-trace-base');
const { createTelemetry } = require('../src/telemetry');
const { createOrderService } = require('../src/orderService');

async function capture(mode) {
  const exporter = new InMemorySpanExporter();
  const telemetry = createTelemetry({ exporter, serviceName: 'performance-test' });
  try {
    const service = createOrderService({ telemetry, orderCount: 6, queryDelayMs: 1 });
    const orders = await service.listOrders(mode);
    await telemetry.provider.forceFlush();
    return { orders, spans: exporter.getFinishedSpans() };
  } finally {
    await telemetry.shutdown();
  }
}

describe('order service trace diagnosis', () => {
  test('makes the N+1 lookup visible as repeated child spans', async () => {
    const { orders, spans } = await capture('nplus1');
    const request = spans.find((span) => span.name === 'demo.orders.list');
    const lookups = spans.filter((span) => span.name === 'demo.db.user_lookup');

    expect(orders).toHaveLength(6);
    expect(lookups).toHaveLength(6);
    for (const lookup of lookups) {
      expect(lookup.parentSpanContext.spanId).toBe(request.spanContext().spanId);
    }
  });

  test('makes the fixed path visible as one batch lookup', async () => {
    const { orders, spans } = await capture('batch');
    const lookups = spans.filter((span) => span.name === 'demo.db.user_batch_lookup');

    expect(orders).toHaveLength(6);
    expect(lookups).toHaveLength(1);
    expect(lookups[0].attributes['demo.lookup.item_count']).toBe(6);
  });
});
