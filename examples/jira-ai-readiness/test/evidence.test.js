'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreTicket, isApprovalFresh, ReadinessInputError } = require('../src/score');
const fixture = require('../fixtures/clear-defect.json');
const input = () => structuredClone(fixture);

for (const value of [undefined, null, false, 0, 1, 'true', {}, []]) {
  test(`implementation requires explicit inspection evidence: ${JSON.stringify(value)}`, () => {
    const data = input();
    data.evidence.repositoryInspected = value;
    assert.throws(() => scoreTicket(data), ReadinessInputError);
  });
}

for (const evidence of [undefined, null, [], 'inspected']) {
  test(`implementation rejects missing or malformed evidence: ${JSON.stringify(evidence)}`, () => {
    assert.throws(() => scoreTicket({ ...input(), evidence }), ReadinessInputError);
  });
}

for (const commits of [undefined, null, {}, [], [null], [{}],
  [{ repository: '', sha: 'abc1234' }], [{ repository: 'service', sha: '' }],
  [{ repository: 'service', sha: 'main' }], [{ repository: 'service', sha: 1234567 }]]) {
  test(`implementation requires canonical commit provenance: ${JSON.stringify(commits)}`, () => {
    const data = input();
    data.evidence.commits = commits;
    assert.throws(() => scoreTicket(data), ReadinessInputError);
  });
}

test('specification and N/A runs do not require repository inspection', () => {
  const specification = { ...input(), stage: 'specification' };
  delete specification.evidence;
  assert.equal(scoreTicket(specification).finalScore, 69);
  assert.equal(scoreTicket({ ...specification, classification: 'not_coding' }).band, 'N/A');
});

test('malformed document references fail with a useful input error', () => {
  for (const linkedDocuments of [null, {}, [null], [{ id: 'design' }], [{ id: '', version: 1 }]]) {
    const data = input();
    data.evidence.linkedDocuments = linkedDocuments;
    assert.throws(() => scoreTicket(data), ReadinessInputError);
  }
});

test('reordering evidence preserves the fingerprint', () => {
  const data = input();
  data.evidence.commits.push({ repository: 'other-service', sha: 'def5678' });
  data.evidence.linkedDocuments = [{ id: 'a', version: 1 }, { id: 'b', version: '2' }];
  const before = scoreTicket(data);
  data.evidence.commits.reverse();
  data.evidence.linkedDocuments.reverse();
  assert.equal(scoreTicket(data).fingerprint, before.fingerprint);
});

test('a revised assessment cannot silently reuse an earlier approval', () => {
  const original = scoreTicket(input());
  const approval = { fingerprint: original.fingerprint, rubricVersion: original.rubricVersion };
  const mutations = [
    (data) => { data.ratings.verification.rating = 4; },
    (data) => { data.ratings.verification.evidence = 'A different test was reviewed.'; },
    (data) => {
      data.blockers = [{ id: 'environment_unavailable', evidence: 'No staging', smallestFix: 'Provide staging' }];
      data.overrides = [{ blocker: 'environment_unavailable', approvedBy: 'reviewer', reason: 'Local test scope is sufficient.' }];
    },
    (data) => { data.evidence.inaccessible = ['optional-reference']; },
  ];
  for (const mutate of mutations) {
    const data = input();
    mutate(data);
    assert.equal(isApprovalFresh(scoreTicket(data), approval), false);
  }
});

test('malformed approval input fails closed', () => {
  for (const result of [undefined, null, {}, { codingAllowed: true }]) {
    assert.equal(isApprovalFresh(result, {}), false);
  }
});
