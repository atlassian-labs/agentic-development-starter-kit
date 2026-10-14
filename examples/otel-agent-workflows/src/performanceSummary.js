'use strict';

function durationMilliseconds(span) {
  return Number((span.duration[0] * 1000 + span.duration[1] / 1e6).toFixed(2));
}

function percentile(values, fraction) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
}

function summarizePerformanceSpans(spans) {
  const requests = spans.filter((span) => span.name === 'demo.orders.list');
  const summaries = requests.map((request) => {
    const requestContext = request.spanContext();
    const lookupSpans = spans.filter((span) => (
      (span.name === 'demo.db.user_lookup' || span.name === 'demo.db.user_batch_lookup')
      && span.spanContext().traceId === requestContext.traceId
      && span.parentSpanContext
      && span.parentSpanContext.spanId === requestContext.spanId
    ));
    return {
      mode: request.attributes['demo.lookup.mode'],
      durationMs: durationMilliseconds(request),
      lookupSpanCount: lookupSpans.length,
    };
  });

  const report = {};
  for (const mode of [...new Set(summaries.map((summary) => summary.mode))]) {
    const matching = summaries.filter((summary) => summary.mode === mode);
    const durations = matching.map((summary) => summary.durationMs);
    const lookupCounts = matching.map((summary) => summary.lookupSpanCount);
    report[mode] = {
      traceCount: matching.length,
      medianDurationMs: percentile(durations, 0.5),
      p95DurationMs: percentile(durations, 0.95),
      medianLookupSpanCount: percentile(lookupCounts, 0.5),
      durationsMs: durations,
    };
  }
  return report;
}

module.exports = {
  summarizePerformanceSpans,
};
