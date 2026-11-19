'use strict';

const assert = require('node:assert/strict');

// Static template checks only. This does not execute a workflow or authorize a user.
function validateWorkflow(workflow) {
  assert.ok(Array.isArray(workflow.stages) && workflow.stages.length > 0, 'stages required');
  const keys = workflow.stages.map((stage) => stage.key);
  assert.equal(new Set(keys).size, keys.length, 'stage keys must be unique');
  for (const stage of workflow.stages) {
    assert.equal(typeof stage.prompt, 'string', `${stage.key}: prompt required`);
    assert.ok(['markdown', 'json', 'text'].includes(stage.output_format), 'known output format required');
    if (stage.agent) assert.equal(stage.prompt_mode, 'replace', 'agent context must be replaced');
    if (stage.bounce_target) {
      assert.ok(keys.includes(stage.bounce_target), 'bounce target must exist');
      assert.ok(keys.indexOf(stage.bounce_target) <= keys.indexOf(stage.key), 'bounce cannot skip ahead');
    }
  }
  if (workflow.key === 'plan-execute-review') {
    assert.deepEqual(keys, ['readiness', 'plan', 'pre-code-approval', 'execute', 'review', 'done']);
    const [readiness, plan, approval, execute, review] = workflow.stages;
    assert.equal(readiness.is_read_only, true, 'readiness must be read-only');
    assert.equal(plan.is_read_only, true, 'plan must be read-only');
    assert.equal(approval.is_human_checkpoint, true, 'approval must be a human checkpoint');
    assert.equal(approval.agent, null, 'an agent cannot approve itself');
    for (const stage of [approval, execute, review]) {
      assert.equal(stage.bounce_target, 'readiness', 'retries must traverse discovery and fresh approval');
    }
    assert.equal(review.output_format, 'json');
    assert.equal(workflow.vibe_mode_compatible, false, 'unattended auto-advance is disabled');
    assert.match(readiness.prompt, /jira-ai-readiness-scorer\.md/);
    assert.match(readiness.prompt, /score\.js/);
    assert.match(execute.prompt, /STOP/);
    assert.match(execute.prompt, /draft pull request/i);
    assert.match(execute.prompt, /never auto-merge/i);
    assert.doesNotMatch(execute.prompt, /do not ask questions/i);
    for (const token of ['approval_artifact', 'readiness_artifact', 'plan_artifact']) {
      assert.ok(execute.prompt.includes(`{{${token}}}`), `${token} must be passed to execution`);
    }
  } else if (workflow.key === 'design-with-nfr-flow') {
    assert.equal(keys[0], 'discovery');
    assert.equal(workflow.stages[0].is_read_only, true);
    assert.ok(keys.indexOf('discovery') < keys.indexOf('data-model'));
    const model = workflow.stages.find((stage) => stage.key === 'data-model');
    assert.match(model.prompt, /discovery_artifact/);
    assert.match(model.prompt, /reuse/i);
    const review = workflow.stages.at(-1);
    assert.equal(review.is_human_checkpoint, true);
    assert.equal(review.bounce_target, 'discovery');
  }
  return true;
}

module.exports = { validateWorkflow };
