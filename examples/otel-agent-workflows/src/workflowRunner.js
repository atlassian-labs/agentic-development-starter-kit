'use strict';

const { SpanStatusCode } = require('@opentelemetry/api');

function textSize(value) {
  if (typeof value === 'string') {
    return value.length;
  }
  if (value === undefined || value === null) {
    return 0;
  }
  return JSON.stringify(value).length;
}

function requireHandler(handlers, stage) {
  const handler = handlers[stage.key] || handlers[stage.agent];
  if (typeof handler !== 'function') {
    throw new Error(`No handler registered for stage: ${stage.key}`);
  }
  return handler;
}

async function runWorkflow(options) {
  const { spec, handlers, telemetry } = options;
  if (!spec || !Array.isArray(spec.stages)) {
    throw new Error('Workflow specification must contain a stages array');
  }
  if (!handlers || !telemetry) {
    throw new Error('Workflow handlers and telemetry are required');
  }

  const runId = options.runId || `run-${Date.now()}`;
  const stageIndexes = new Map(spec.stages.map((stage, index) => [stage.key, index]));
  const attempts = new Map();
  const artifacts = {};
  const stageHistory = [];
  const bounceLimit = Number.isInteger(spec.bounce_limit) ? spec.bounce_limit : 0;
  let bounceCount = 0;
  let index = 0;
  let outcome = 'complete';

  const workflowSpan = telemetry.startSpan('agentic.workflow.run', {
    'agentic.workflow.key': spec.key || 'unknown',
    'agentic.workflow.run_id': runId,
    'agentic.workflow.stage_count': spec.stages.length,
  });

  try {
    while (index < spec.stages.length) {
      const stage = spec.stages[index];
      const attempt = (attempts.get(stage.key) || 0) + 1;
      attempts.set(stage.key, attempt);

      const result = await telemetry.inSpan(
        `agentic.stage.${stage.key}`,
        {
          'agentic.workflow.key': spec.key || 'unknown',
          'agentic.workflow.run_id': runId,
          'agentic.stage.key': stage.key,
          'agentic.stage.index': index,
          'agentic.stage.attempt': attempt,
          'agentic.agent.role': stage.agent || 'none',
          'agentic.prompt.mode': stage.prompt_mode || 'unspecified',
          'agentic.output.format': stage.output_format || 'unspecified',
          'agentic.checkpoint.human': stage.is_human_checkpoint === true,
        },
        workflowSpan,
        async (stageSpan) => {
          const traceTool = async (toolName, operation) => telemetry.inSpan(
            'agentic.tool',
            {
              'agentic.workflow.key': spec.key || 'unknown',
              'agentic.stage.key': stage.key,
              'agentic.tool.name': toolName,
            },
            stageSpan,
            async (toolSpan) => {
              try {
                const toolResult = await operation(toolSpan);
                if (toolSpan) {
                  toolSpan.setAttribute('agentic.tool.outcome', 'complete');
                }
                return toolResult;
              } catch (error) {
                if (toolSpan) {
                  toolSpan.setAttribute('agentic.tool.outcome', 'failed');
                }
                throw error;
              }
            },
          );

          let stageResult;
          if (stage.is_human_checkpoint === true) {
            const checkpointHandler = handlers.humanCheckpoint;
            if (typeof checkpointHandler !== 'function') {
              throw new Error(`No human checkpoint handler registered for stage: ${stage.key}`);
            }
            stageResult = await checkpointHandler({ stage, attempt, artifacts, traceTool });
          } else if (stage.agent) {
            const handler = requireHandler(handlers, stage);
            stageResult = await handler({ stage, attempt, artifacts, traceTool });
          } else {
            stageResult = { artifact: '', verdict: 'approve' };
          }

          const normalized = stageResult || {};
          const verdict = normalized.verdict || 'approve';
          if (stageSpan) {
            stageSpan.setAttribute('agentic.stage.outcome', verdict === 'bounce' ? 'bounce' : 'complete');
            stageSpan.setAttribute('agentic.output.size', textSize(normalized.artifact));
            if (stage.key === 'review' || normalized.verdict) {
              stageSpan.setAttribute('agentic.review.verdict', verdict);
            }
          }
          return normalized;
        },
      );

      const verdict = result.verdict || 'approve';
      if (result.artifact !== undefined) {
        artifacts[stage.key] = result.artifact;
      }
      stageHistory.push({ stage: stage.key, attempt, verdict });

      if (verdict === 'escalate') {
        outcome = 'escalated';
        break;
      }

      if (verdict === 'bounce') {
        bounceCount += 1;
        if (workflowSpan) {
          workflowSpan.addEvent('agentic.workflow.bounce', {
            'agentic.bounce.count': bounceCount,
            'agentic.bounce.from_stage': stage.key,
            'agentic.bounce.target_stage': stage.bounce_target || 'none',
          });
        }
        if (bounceCount > bounceLimit) {
          outcome = 'escalated';
          break;
        }
        if (!stage.bounce_target || !stageIndexes.has(stage.bounce_target)) {
          throw new Error(`Invalid bounce target for stage: ${stage.key}`);
        }
        index = stageIndexes.get(stage.bounce_target);
        continue;
      }

      index += 1;
    }

    if (workflowSpan) {
      workflowSpan.setAttribute('agentic.workflow.outcome', outcome);
      workflowSpan.setAttribute('agentic.bounce.count', bounceCount);
      workflowSpan.setStatus({ code: SpanStatusCode.OK });
    }

    return {
      runId,
      workflowKey: spec.key,
      outcome,
      bounceCount,
      artifacts,
      stageHistory,
    };
  } catch (error) {
    if (workflowSpan) {
      workflowSpan.setAttribute('agentic.workflow.outcome', 'failed');
      workflowSpan.setAttribute('agentic.bounce.count', bounceCount);
      workflowSpan.setAttribute('error.type', error && error.name ? error.name : 'Error');
      workflowSpan.setStatus({ code: SpanStatusCode.ERROR });
    }
    throw error;
  } finally {
    if (workflowSpan) {
      workflowSpan.end();
    }
  }
}

module.exports = {
  runWorkflow,
};
