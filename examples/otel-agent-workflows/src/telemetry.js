'use strict';

const { context, diag, trace, SpanStatusCode } = require('@opentelemetry/api');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const {
  BasicTracerProvider,
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');

const INSTRUMENTATION_NAME = 'agentic-development-starter-kit';
const INSTRUMENTATION_VERSION = '0.1.0';

function createExporter(type, endpoint) {
  if (type === 'console') {
    return new ConsoleSpanExporter();
  }

  if (type === 'otlp') {
    return new OTLPTraceExporter({
      url: endpoint || 'http://localhost:4318/v1/traces',
    });
  }

  throw new Error(`Unsupported trace exporter: ${type}`);
}

function createTelemetry(options = {}) {
  const enabled = options.enabled !== false;
  const exportErrors = [];

  function recordExportError(phase, error) {
    const diagnostic = {
      phase,
      errorType: error && error.name ? error.name : 'Error',
    };
    exportErrors.push(diagnostic);
    if (typeof options.onExportError === 'function') {
      options.onExportError(diagnostic);
    } else {
      diag.error(`OpenTelemetry ${phase} failed (${diagnostic.errorType})`);
    }
  }

  const configuredExporter = enabled
    ? options.exporter || createExporter(options.exporterType || 'otlp', options.endpoint)
    : null;
  const exporter = configuredExporter ? {
    export(spans, callback) {
      try {
        configuredExporter.export(spans, (result) => {
          if (!result || result.code !== 0) {
            recordExportError('export', result && result.error);
          }
          callback(result);
        });
      } catch (error) {
        recordExportError('export', error);
        callback({ code: 1, error });
      }
    },
    shutdown() {
      return configuredExporter.shutdown();
    },
    ...(typeof configuredExporter.forceFlush === 'function'
      ? { forceFlush: () => configuredExporter.forceFlush() }
      : {}),
  } : null;
  const spanProcessor = exporter
    ? options.batch === true
      ? new BatchSpanProcessor(exporter)
      : new SimpleSpanProcessor(exporter)
    : null;

  const provider = new BasicTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: options.serviceName || 'agentic-workflow-example',
      [ATTR_SERVICE_VERSION]: INSTRUMENTATION_VERSION,
    }),
    spanProcessors: spanProcessor ? [spanProcessor] : [],
  });
  const tracer = provider.getTracer(INSTRUMENTATION_NAME, INSTRUMENTATION_VERSION);

  function startSpan(name, attributes = {}, parentSpan = null) {
    if (!enabled) {
      return null;
    }

    const parentContext = parentSpan
      ? trace.setSpan(context.active(), parentSpan)
      : context.active();
    return tracer.startSpan(name, { attributes }, parentContext);
  }

  async function inSpan(name, attributes, parentSpan, operation) {
    const span = startSpan(name, attributes, parentSpan);
    try {
      const result = await operation(span);
      if (span) {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      return result;
    } catch (error) {
      if (span) {
        span.setAttribute('error.type', error && error.name ? error.name : 'Error');
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      throw error;
    } finally {
      if (span) {
        span.end();
      }
    }
  }

  async function shutdown() {
    try {
      await provider.forceFlush();
    } catch (error) {
      recordExportError('flush', error);
    }
    try {
      await provider.shutdown();
    } catch (error) {
      recordExportError('shutdown', error);
    }
    return {
      ok: exportErrors.length === 0,
      errors: [...exportErrors],
    };
  }

  return {
    enabled,
    provider,
    tracer,
    startSpan,
    inSpan,
    shutdown,
  };
}

module.exports = {
  createExporter,
  createTelemetry,
};
