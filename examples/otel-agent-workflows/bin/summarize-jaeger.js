#!/usr/bin/env node
'use strict';

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

function readOtlpValue(value = {}) {
  const keys = ['stringValue', 'intValue', 'doubleValue', 'boolValue'];
  const key = keys.find((candidate) => Object.prototype.hasOwnProperty.call(value, candidate));
  return key ? value[key] : undefined;
}

function attributesToMap(attributes = []) {
  return new Map(attributes.map((attribute) => [attribute.key, readOtlpValue(attribute.value)]));
}

function groupSpansByTrace(payload) {
  const traces = new Map();
  const resourceSpans = payload && payload.result && Array.isArray(payload.result.resourceSpans)
    ? payload.result.resourceSpans
    : [];

  for (const resourceSpan of resourceSpans) {
    for (const scopeSpan of resourceSpan.scopeSpans || []) {
      for (const span of scopeSpan.spans || []) {
        const trace = traces.get(span.traceId) || [];
        trace.push(span);
        traces.set(span.traceId, trace);
      }
    }
  }
  return [...traces.entries()].map(([traceId, spans]) => ({ traceId, spans }));
}

function spanDurationMs(span) {
  if (!span || !span.startTimeUnixNano || !span.endTimeUnixNano) {
    return null;
  }
  try {
    const duration = BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano);
    return duration >= 0 ? Number(duration) / 1_000_000 : null;
  } catch {
    return null;
  }
}

function summarizePayload(payload) {
  const summaries = groupSpansByTrace(payload).map((trace) => {
    const request = trace.spans.find((span) => span.name === 'demo.orders.list');
    const childLookups = trace.spans.filter((span) => (
      span.name === 'demo.db.user_lookup'
      || span.name === 'demo.db.user_batch_lookup'
    ));
    const requestAttributes = attributesToMap(request && request.attributes);
    const durationMs = spanDurationMs(request);
    return {
      traceId: trace.traceId,
      mode: requestAttributes.get('demo.lookup.mode') || 'unknown',
      durationMs: durationMs === null ? null : Number(durationMs.toFixed(2)),
      lookupSpanCount: childLookups.length,
      lookupOperations: [...new Set(childLookups.map((span) => span.name))],
    };
  }).filter((summary) => summary.durationMs !== null);

  const grouped = {};
  for (const summary of summaries) {
    grouped[summary.mode] = grouped[summary.mode] || [];
    grouped[summary.mode].push(summary);
  }

  const report = {};
  for (const [mode, traces] of Object.entries(grouped)) {
    const durations = traces.map((trace) => trace.durationMs);
    const lookupCounts = traces.map((trace) => trace.lookupSpanCount);
    report[mode] = {
      traceCount: traces.length,
      medianDurationMs: percentile(durations, 0.5),
      p95DurationMs: percentile(durations, 0.95),
      medianLookupSpanCount: percentile(lookupCounts, 0.5),
      exampleTraceId: traces[0].traceId,
    };
  }
  return report;
}

function buildQuery(baseUrl, service, operation, limit, lookbackMinutes, now = new Date()) {
  const query = new URL('/api/v3/traces', baseUrl);
  query.searchParams.set('query.serviceName', service);
  query.searchParams.set('query.operationName', operation);
  query.searchParams.set('query.startTimeMin', new Date(now.getTime() - lookbackMinutes * 60_000).toISOString());
  query.searchParams.set('query.startTimeMax', now.toISOString());
  query.searchParams.set('query.searchDepth', String(limit));
  return query;
}

async function main() {
  const baseUrl = readArgument('jaeger', process.env.JAEGER_QUERY_URL || 'http://localhost:16686');
  const service = readArgument('service', 'agentic-performance-example');
  const operation = readArgument('operation', 'demo.orders.list');
  const limit = Number(readArgument('limit', '20'));
  const lookbackMinutes = Number(readArgument('lookback-minutes', '60'));
  if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(lookbackMinutes) || lookbackMinutes <= 0) {
    throw new Error('limit and lookback-minutes must be positive');
  }

  const query = buildQuery(baseUrl, service, operation, limit, lookbackMinutes);
  const response = await fetch(query);
  if (!response.ok) {
    throw new Error(`Jaeger query failed with HTTP ${response.status}`);
  }
  const payload = await response.json();
  const report = summarizePayload(payload);
  process.stdout.write(`${JSON.stringify({ service, operation, report }, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`Trace summary failed (${error.name || 'Error'}).\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  attributesToMap,
  buildQuery,
  groupSpansByTrace,
  spanDurationMs,
  summarizePayload,
};
