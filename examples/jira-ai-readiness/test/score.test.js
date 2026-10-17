'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {
  DIMENSIONS,
  ReadinessInputError,
  scoreTicket,
  isApprovalFresh,
  formatReport,
} = require('../src/score');

const fixture = (name) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', `${name}.json`), 'utf8'));

function ratingsAll(value, overrides = {}) {
  return Object.fromEntries(
    Object.keys(DIMENSIONS).map((key) => [
      key,
      { rating: overrides[key] ?? value, evidence: `Evidence for ${key}.` },
    ]),
  );
}

function implementationInput(extra = {}) {
  return {
    ticket: { key: 'DEMO-1', updatedAt: '2026-10-01T00:00:00Z' },
    stage: 'implementation',
    classification: 'applicable',
    ratings: ratingsAll(5),
    blockers: [],
    evidence: { repositoryInspected: true, linkedDocuments: [], commits: [{ repository: 'svc', sha: 'abc' }] },
    ...extra,
  };
}

test('weights add up to 100 when every dimension is rated 5', () => {
  assert.equal(scoreTicket(implementationInput()).subtotal, 100);
});

test('Example A: a clear defect is AI Ready with no cap', () => {
  const result = scoreTicket(fixture('clear-defect'));
  assert.equal(result.classification, 'Applicable');
  assert.ok(result.finalScore >= 85);
  assert.equal(result.cap, null);
  assert.equal(result.band, 'AI Ready');
  assert.equal(result.codingAllowed, true);
});

test('Example B: a missing design caps the score at 49', () => {
  const result = scoreTicket(fixture('missing-design'));
  assert.ok(result.subtotal > 49);
  assert.equal(result.finalScore, 49);
  assert.equal(result.band, 'Not Ready');
  assert.match(result.blockers[0].smallestFix, /approved interaction design/);
  assert.equal(result.codingAllowed, false);
});

test('a ticket calculated at 76 is capped at 49 when the UI design is not approved', () => {
  const ratings = ratingsAll(4, { behavioralSpecification: 3 });
  const uncapped = scoreTicket(implementationInput({ ratings }));
  assert.equal(uncapped.subtotal, 76);
  assert.equal(uncapped.band, 'AI Assisted');

  const capped = scoreTicket(
    implementationInput({
      ratings,
      blockers: [{ id: 'missing_decision', evidence: 'UI design not approved.', smallestFix: 'Approve the design.' }],
    }),
  );
  assert.equal(capped.subtotal, 76);
  assert.equal(capped.finalScore, 49);
});

test('Example C: cross-repository work without sequencing is capped at 69', () => {
  const result = scoreTicket(
    implementationInput({
      ratings: ratingsAll(5, { scopeAndDecomposition: 2 }),
      blockers: [
        {
          id: 'multi_pr_without_sequencing',
          evidence: 'Backend and frontend change in one ticket with no deployment order.',
          smallestFix: 'Create child tasks or state the deployment order.',
        },
      ],
    }),
  );
  assert.equal(result.finalScore, 69);
  assert.equal(result.band, 'Grooming Required');
});

test('the lowest applicable cap wins', () => {
  const result = scoreTicket(
    implementationInput({
      blockers: [
        { id: 'environment_unavailable', evidence: 'No staging.', smallestFix: 'Provision staging.' },
        { id: 'unclear_privacy_or_authorization', evidence: 'Role rules undefined.', smallestFix: 'Define roles.' },
      ],
    }),
  );
  assert.equal(result.cap, 49);
  assert.equal(result.finalScore, 49);
});

test('Example D: non-coding work is N/A with no score', () => {
  const result = scoreTicket(fixture('not-coding'));
  assert.equal(result.applicable, false);
  assert.equal(result.finalScore, null);
  assert.equal(result.band, 'N/A');
  assert.equal(result.codingAllowed, false);
});

test('Example E: an unreadable ticket produces no score', () => {
  assert.throws(
    () => scoreTicket({ ticket: { key: 'DEMO-9', readable: false }, stage: 'specification', classification: 'applicable' }),
    (error) => error instanceof ReadinessInputError && /could not be read/.test(error.message),
  );
});

test('Example I: a specification-only run is capped at 69 and cannot code', () => {
  const result = scoreTicket(fixture('specification-only'));
  assert.ok(result.subtotal > 69);
  assert.equal(result.finalScore, 69);
  assert.equal(result.band, 'Grooming Required');
  assert.equal(result.codingAllowed, false);
  assert.ok(result.blockers.some((b) => b.id === 'repository_not_inspected' && b.automatic));
});

test('implementation stage refuses to score when the repository was not inspected', () => {
  assert.throws(
    () => scoreTicket(implementationInput({ evidence: { repositoryInspected: false } })),
    ReadinessInputError,
  );
});

test('Example J: the fingerprint is stable for the same evidence', () => {
  const a = scoreTicket(fixture('clear-defect'));
  const b = scoreTicket(fixture('clear-defect'));
  assert.equal(a.fingerprint, b.fingerprint);
});

test('Example J: a changed ticket, document or commit makes an earlier approval stale', () => {
  const approved = scoreTicket(fixture('clear-defect'));
  const approval = { fingerprint: approved.fingerprint, rubricVersion: approved.rubricVersion };
  assert.equal(isApprovalFresh(approved, approval), true);

  const ticketEdited = fixture('clear-defect');
  ticketEdited.ticket.updatedAt = '2026-10-05T12:00:00Z';
  assert.equal(isApprovalFresh(scoreTicket(ticketEdited), approval), false);

  const newCommit = fixture('clear-defect');
  newCommit.evidence.commits[0].sha = 'ffff000';
  assert.equal(isApprovalFresh(scoreTicket(newCommit), approval), false);

  const docChanged = fixture('missing-design');
  const docApproval = { fingerprint: scoreTicket(docChanged).fingerprint, rubricVersion: '3' };
  docChanged.evidence.linkedDocuments[0].version = 8;
  assert.notEqual(scoreTicket(docChanged).fingerprint, docApproval.fingerprint);
});

test('approval never unlocks coding for a non-coding band', () => {
  const result = scoreTicket(fixture('missing-design'));
  assert.equal(isApprovalFresh(result, { fingerprint: result.fingerprint, rubricVersion: '3' }), false);
});

test('a human override removes a cap only with a written reason', () => {
  const blockers = [{ id: 'environment_unavailable', evidence: 'No staging.', smallestFix: 'Provision staging.' }];
  assert.throws(
    () => scoreTicket(implementationInput({ blockers, overrides: [{ blocker: 'environment_unavailable', approvedBy: 'lead' }] })),
    ReadinessInputError,
  );
  const result = scoreTicket(
    implementationInput({
      blockers,
      overrides: [{ blocker: 'environment_unavailable', approvedBy: 'lead', reason: 'Change is verified by unit tests only.' }],
    }),
  );
  assert.equal(result.cap, null);
  assert.equal(result.finalScore, 100);
  assert.match(formatReport(result), /Override of `environment_unavailable` by lead/);
});

test('every rating needs evidence and a 0-5 integer', () => {
  assert.throws(() => scoreTicket(implementationInput({ ratings: ratingsAll(6) })), ReadinessInputError);
  const noEvidence = ratingsAll(5);
  noEvidence.verification.evidence = '';
  assert.throws(() => scoreTicket(implementationInput({ ratings: noEvidence })), ReadinessInputError);
  const missing = ratingsAll(5);
  delete missing.verification;
  assert.throws(() => scoreTicket(implementationInput({ ratings: missing })), ReadinessInputError);
});

test('unknown blockers and blockers without a fix are rejected', () => {
  assert.throws(
    () => scoreTicket(implementationInput({ blockers: [{ id: 'vibes', evidence: 'x', smallestFix: 'y' }] })),
    ReadinessInputError,
  );
  assert.throws(
    () => scoreTicket(implementationInput({ blockers: [{ id: 'missing_decision', evidence: 'x' }] })),
    ReadinessInputError,
  );
});

test('the Jira comment stays under 3,500 characters and ends with metadata', () => {
  for (const name of ['clear-defect', 'missing-design', 'specification-only', 'not-coding']) {
    const report = formatReport(scoreTicket(fixture(name)));
    assert.ok(report.length < 3500, `${name} report is ${report.length} characters`);
    assert.match(report, /Evidence fingerprint: [0-9a-f]{16}/);
  }
});
