'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const docs = [
  'README.md', 'docs/workflow-contracts.md',
  'docs/adr/ADR-013-activity-snapshot-contract.md',
  'examples/activity-snapshot-contract/README.md',
  'examples/activity-snapshot-contract/context.md',
  'examples/jira-ai-readiness/README.md',
];

test('public onboarding and contract examples link to existing local resources', () => {
  for (const file of docs) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const [, url] of text.matchAll(/\[[^\]]+\]\(([^\s)]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(url)) continue;
      const target = path.resolve(root, path.dirname(file), decodeURIComponent(url.split('#')[0]));
      assert.ok(target.startsWith(`${root}${path.sep}`), `${file}: link stays in repository`);
      assert.ok(fs.existsSync(target), `${file}: missing ${url}`);
    }
  }
});

test('copy instructions use the actual root templates', () => {
  const text = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.doesNotMatch(text, /cp[^\n]*templates\/next-idea/);
  for (const file of ['AGENTS.md', '.context.md', 'map.md', 'docs', 'prompts', 'workflows', 'src/agents/slice-context-template.md']) {
    assert.ok(fs.existsSync(path.join(root, file)), file);
  }
});

// These are lightweight static checks, not a full documentation link crawler or
// proof of confidentiality review. Synthetic examples must stay self-contained.
test('new contract example contains no internal tracker or employee references', () => {
  for (const file of ['contract_store.py', 'test_contract.py', 'context.md', 'README.md']) {
    const text = fs.readFileSync(path.join(root, 'examples/activity-snapshot-contract', file), 'utf8');
    assert.doesNotMatch(text, /hello\.(jira\.)?atlassian|opsj\.atlassian|atlassian\.slack|TATECH-\d|HOT-\d|@atlassian\.com/);
  }
});
