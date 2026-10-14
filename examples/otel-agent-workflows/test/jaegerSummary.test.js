'use strict';

const { buildQuery, summarizePayload } = require('../bin/summarize-jaeger');

function span(traceId, spanId, name, start, end, attributes = [], parentSpanId) {
  return {
    traceId,
    spanId,
    parentSpanId,
    name,
    startTimeUnixNano: String(start),
    endTimeUnixNano: String(end),
    attributes,
  };
}

function attribute(key, value) {
  return { key, value: { stringValue: value } };
}

describe('Jaeger v3 summary', () => {
  test('builds a bounded v3 query with required time limits', () => {
    const now = new Date('2026-10-14T18:00:00.000Z');
    const query = buildQuery('http://localhost:16686', 'example', 'operation', 20, 60, now);

    expect(query.pathname).toBe('/api/v3/traces');
    expect(query.searchParams.get('query.serviceName')).toBe('example');
    expect(query.searchParams.get('query.operationName')).toBe('operation');
    expect(query.searchParams.get('query.startTimeMin')).toBe('2026-10-14T17:00:00.000Z');
    expect(query.searchParams.get('query.startTimeMax')).toBe('2026-10-14T18:00:00.000Z');
    expect(query.searchParams.get('query.searchDepth')).toBe('20');
  });

  test('summarizes OTLP JSON resource spans by trace and mode', () => {
    const payload = {
      result: {
        resourceSpans: [{
          scopeSpans: [{
            spans: [
              span('trace-a', 'root-a', 'demo.orders.list', 0, 100_000_000, [attribute('demo.lookup.mode', 'nplus1')]),
              span('trace-a', 'child-a1', 'demo.db.user_lookup', 1, 2, [], 'root-a'),
              span('trace-a', 'child-a2', 'demo.db.user_lookup', 2, 3, [], 'root-a'),
              span('trace-b', 'root-b', 'demo.orders.list', 0, 8_000_000, [attribute('demo.lookup.mode', 'batch')]),
              span('trace-b', 'child-b1', 'demo.db.user_batch_lookup', 1, 2, [], 'root-b'),
            ],
          }],
        }],
      },
    };

    expect(summarizePayload(payload)).toEqual({
      nplus1: {
        traceCount: 1,
        medianDurationMs: 100,
        p95DurationMs: 100,
        medianLookupSpanCount: 2,
        exampleTraceId: 'trace-a',
      },
      batch: {
        traceCount: 1,
        medianDurationMs: 8,
        p95DurationMs: 8,
        medianLookupSpanCount: 1,
        exampleTraceId: 'trace-b',
      },
    });
  });
});
