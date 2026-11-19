'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateWorkflow } = require('./workflow-validator');
const root = path.resolve(__dirname, '..');
const load = (name) => JSON.parse(fs.readFileSync(path.join(root, 'workflows', `${name}.json`), 'utf8'));

test('coding and design templates satisfy their static contracts', () => {
  assert.equal(validateWorkflow(load('plan-execute-review')), true);
  assert.equal(validateWorkflow(load('design-with-nfr-flow')), true);
});

const mutations = {
  'approval after coding': (w) => { [w.stages[2], w.stages[3]] = [w.stages[3], w.stages[2]]; },
  'agent approval': (w) => { w.stages[2].agent = 'coder'; },
  'missing human checkpoint': (w) => { w.stages[2].is_human_checkpoint = false; },
  'mutable planning': (w) => { delete w.stages[1].is_read_only; },
  'retry bypasses approval': (w) => { w.stages[3].bounce_target = 'execute'; },
  'review bypasses approval': (w) => { w.stages[4].bounce_target = 'execute'; },
  'checkpoint lacks bounce path': (w) => { delete w.stages[2].bounce_target; },
  'unknown bounce target': (w) => { w.stages[4].bounce_target = 'missing'; },
  'unattended advancement': (w) => { w.vibe_mode_compatible = true; },
  'execution suppresses questions': (w) => { w.stages[3].prompt += ' Do NOT ask questions.'; },
  'missing approval input': (w) => { w.stages[3].prompt = w.stages[3].prompt.replace('{{approval_artifact}}', ''); },
};
for (const [name, mutate] of Object.entries(mutations)) {
  test(`reject template regression: ${name}`, () => {
    const workflow = load('plan-execute-review');
    mutate(workflow);
    assert.throws(() => validateWorkflow(workflow), assert.AssertionError);
  });
}

test('design discovery cannot be removed before proposing storage', () => {
  const workflow = load('design-with-nfr-flow');
  workflow.stages.shift();
  assert.throws(() => validateWorkflow(workflow), assert.AssertionError);
});

test('slice context names data semantics and decision-to-test provenance', () => {
  const text = fs.readFileSync(path.join(root, 'src/agents/slice-context-template.md'), 'utf8');
  for (const phrase of ['Decision', 'Affected Files', 'Test', 'Owner', 'Consumers', 'Omitted', 'Null', 'Snapshot', 'Last verified']) {
    assert.ok(text.includes(phrase), phrase);
  }
});
