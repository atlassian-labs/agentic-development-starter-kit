'use strict';

const crypto = require('node:crypto');

const RUBRIC_VERSION = '3';

// Each dimension is rated 0-5 by the analyzer and multiplied by its weight.
// The weights add up to 100 when every dimension is rated 5.
const DIMENSIONS = Object.freeze({
  problemDefinition: { label: 'Problem definition', multiplier: 3 },
  behavioralSpecification: { label: 'Behavioral specification', multiplier: 4 },
  technicalDiscoverability: { label: 'Technical discoverability', multiplier: 3 },
  verification: { label: 'Verification', multiplier: 3 },
  dependenciesAndEnvironment: { label: 'Dependencies and environment', multiplier: 3 },
  scopeAndDecomposition: { label: 'Scope and decomposition', multiplier: 2 },
  riskAndGovernance: { label: 'Risk and governance', multiplier: 2 },
});

// Hard caps are applied after the subtotal. The lowest applicable cap wins.
const BLOCKERS = Object.freeze({
  missing_decision: { cap: 49, description: 'A required product, UX, API, schema or ownership decision is missing' },
  inaccessible_required_evidence: { cap: 49, description: 'A page or source required to resolve behavior, design, contract, security or rollout cannot be read' },
  unclear_privacy_or_authorization: { cap: 49, description: 'Privacy or authorization behavior is unclear' },
  code_design_conflict: { cap: 49, description: 'Current code and the linked design conflict with no recorded migration decision' },
  unresolved_blocking_dependency: { cap: 49, description: 'A blocking dependency is unresolved' },
  repository_not_inspected: { cap: 69, description: 'The canonical repository is known but was not inspected' },
  environment_unavailable: { cap: 69, description: 'A required environment is unavailable' },
  rollout_without_observability_or_rollback: { cap: 69, description: 'A medium or high-risk rollout has no observability or rollback plan' },
  multi_pr_without_sequencing: { cap: 69, description: 'The work spans multiple pull requests or repositories without explicit sequencing' },
});

const CLASSIFICATIONS = Object.freeze({
  applicable: 'Applicable',
  needs_decomposition: 'Needs decomposition',
  human_led: 'Human-led',
  already_underway: 'Already underway',
  already_implemented: 'Already implemented',
  not_coding: 'Not coding',
});

const NOT_APPLICABLE_ACTIONS = Object.freeze({
  needs_decomposition: 'Split into implementation-level child tasks and score each child independently.',
  human_led: 'Resolve the open product, UX, architecture, security or ownership decision before coding.',
  already_underway: 'Implementation or review is in progress. Current pickup readiness does not apply.',
  already_implemented: 'The canonical branch already contains the behavior. Reconcile the Jira status.',
  not_coding: 'Route to the appropriate research, operations, planning or coordination workflow.',
});

const STAGES = Object.freeze({
  specification: 'Specification Readiness',
  implementation: 'Implementation Readiness',
});

const BANDS = Object.freeze([
  { min: 85, name: 'AI Ready', allowed: 'May implement after fresh evidence, human approval and normal repository authorization.' },
  { min: 70, name: 'AI Assisted', allowed: 'May implement with named and recorded human checkpoints.' },
  { min: 50, name: 'Grooming Required', allowed: 'May investigate and propose ticket edits. Must not implement.' },
  { min: 0, name: 'Not Ready', allowed: 'Product, design, architecture, dependency or safety work is required.' },
]);

const CODING_BANDS = new Set(['AI Ready', 'AI Assisted']);

class ReadinessInputError extends Error {}

function fail(message) {
  throw new ReadinessInputError(message);
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${field} must be a non-empty string`);
}

function validateInput(input) {
  if (!input || typeof input !== 'object') fail('input must be an object');
  const { ticket, stage, classification } = input;
  if (!ticket || typeof ticket !== 'object') fail('ticket is required');
  if (ticket.readable === false) {
    fail(`ticket ${ticket.key || '(unknown)'} could not be read; no score is produced from a title or cached copy`);
  }
  requireText(ticket.key, 'ticket.key');
  requireText(ticket.updatedAt, 'ticket.updatedAt');
  if (!Object.hasOwn(STAGES, stage)) fail(`stage must be one of: ${Object.keys(STAGES).join(', ')}`);
  if (!Object.hasOwn(CLASSIFICATIONS, classification)) {
    fail(`classification must be one of: ${Object.keys(CLASSIFICATIONS).join(', ')}`);
  }
}

function validateRatings(ratings) {
  if (!ratings || typeof ratings !== 'object') fail('ratings are required for an applicable ticket');
  for (const key of Object.keys(ratings)) {
    if (!Object.hasOwn(DIMENSIONS, key)) fail(`unknown dimension: ${key}`);
  }
  for (const key of Object.keys(DIMENSIONS)) {
    const entry = ratings[key];
    if (!entry) fail(`missing rating for ${key}`);
    if (!Number.isInteger(entry.rating) || entry.rating < 0 || entry.rating > 5) {
      fail(`${key}.rating must be an integer from 0 to 5`);
    }
    requireText(entry.evidence, `${key}.evidence`);
  }
}

function validateBlockers(blockers, overrides) {
  for (const [i, blocker] of blockers.entries()) {
    if (!Object.hasOwn(BLOCKERS, blocker.id)) fail(`blockers[${i}].id is not a known blocker: ${blocker.id}`);
    requireText(blocker.evidence, `blockers[${i}].evidence`);
    requireText(blocker.smallestFix, `blockers[${i}].smallestFix`);
  }
  for (const [i, override] of overrides.entries()) {
    if (!blockers.some((b) => b.id === override.blocker)) {
      fail(`overrides[${i}].blocker does not match a reported blocker: ${override.blocker}`);
    }
    requireText(override.reason, `overrides[${i}].reason`);
    requireText(override.approvedBy, `overrides[${i}].approvedBy`);
  }
}

function sortedBy(list, keys) {
  return [...list]
    .map((item) => Object.fromEntries(keys.map((k) => [k, String(item[k])])))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

// The fingerprint changes whenever any evidence the decision depends on changes.
// An approval recorded against an older fingerprint is stale.
function evidenceFingerprint(input) {
  const evidence = input.evidence || {};
  const canonical = {
    ticketKey: input.ticket.key,
    ticketUpdatedAt: input.ticket.updatedAt,
    rubricVersion: RUBRIC_VERSION,
    stage: input.stage,
    linkedDocuments: sortedBy(evidence.linkedDocuments || [], ['id', 'version']),
    commits: sortedBy(evidence.commits || [], ['repository', 'sha']),
  };
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex').slice(0, 16);
}

function bandFor(score) {
  return BANDS.find((band) => score >= band.min);
}

function scoreTicket(input) {
  validateInput(input);
  const fingerprint = evidenceFingerprint(input);
  const base = {
    rubricVersion: RUBRIC_VERSION,
    ticketKey: input.ticket.key,
    stage: STAGES[input.stage],
    classification: CLASSIFICATIONS[input.classification],
    fingerprint,
    inaccessibleEvidence: (input.evidence && input.evidence.inaccessible) || [],
  };

  if (input.classification !== 'applicable') {
    return {
      ...base,
      applicable: false,
      finalScore: null,
      band: 'N/A',
      allowed: NOT_APPLICABLE_ACTIONS[input.classification],
      codingAllowed: false,
    };
  }

  validateRatings(input.ratings);
  const blockers = [...(input.blockers || [])];
  const overrides = input.overrides || [];

  // A specification-only run never inspected the repository, so it cannot
  // reach a coding band no matter how strong the ticket text is.
  const evidence = input.evidence || {};
  if (input.stage === 'specification' && !blockers.some((b) => b.id === 'repository_not_inspected')) {
    blockers.push({
      id: 'repository_not_inspected',
      evidence: 'Specification Readiness run; the canonical repository was not scanned.',
      smallestFix: 'Run Implementation Readiness with a bounded scan of the canonical branch before AI pickup.',
      automatic: true,
    });
  }
  if (input.stage === 'implementation' && evidence.repositoryInspected === false) {
    fail('implementation stage requires evidence.repositoryInspected to be true');
  }
  validateBlockers(blockers, overrides);

  const dimensions = Object.entries(DIMENSIONS).map(([key, def]) => ({
    key,
    label: def.label,
    rating: input.ratings[key].rating,
    points: input.ratings[key].rating * def.multiplier,
    maximum: 5 * def.multiplier,
    evidence: input.ratings[key].evidence,
  }));
  const subtotal = dimensions.reduce((sum, d) => sum + d.points, 0);

  const overridden = new Set(overrides.map((o) => o.blocker));
  const appliedCaps = blockers
    .filter((b) => !overridden.has(b.id))
    .map((b) => ({ ...b, cap: BLOCKERS[b.id].cap, description: BLOCKERS[b.id].description }));
  const cap = appliedCaps.length ? Math.min(...appliedCaps.map((c) => c.cap)) : null;
  const finalScore = cap === null ? subtotal : Math.min(subtotal, cap);
  const band = bandFor(finalScore);

  return {
    ...base,
    applicable: true,
    dimensions,
    subtotal,
    cap,
    blockers: appliedCaps,
    overrides,
    finalScore,
    band: band.name,
    allowed: band.allowed,
    codingAllowed: input.stage === 'implementation' && CODING_BANDS.has(band.name),
  };
}

// Coding may start only when a human approved this exact evidence fingerprint
// on an Implementation Readiness result in a coding band.
function isApprovalFresh(result, approval) {
  if (!approval || !result.codingAllowed) return false;
  return approval.fingerprint === result.fingerprint && approval.rubricVersion === result.rubricVersion;
}

function formatReport(result) {
  const lines = [];
  const heading = result.applicable ? `${result.band} (${result.finalScore}/100)` : `N/A: ${result.classification}`;
  lines.push(`## AI coding readiness: ${heading}`, '');
  lines.push(`**Next step:** ${result.allowed}`, '');

  if (result.applicable) {
    lines.push('| Dimension | Rating | Points | Evidence |', '|---|---:|---:|---|');
    for (const d of result.dimensions) {
      lines.push(`| ${d.label} | ${d.rating}/5 | ${d.points}/${d.maximum} | ${d.evidence} |`);
    }
    lines.push('');
    if (result.blockers.length) {
      lines.push('**Blocking gaps and smallest fixes**', '');
      for (const b of result.blockers) {
        lines.push(`- Cap ${b.cap}: ${b.description}. Evidence: ${b.evidence} Fix: ${b.smallestFix}`);
      }
      lines.push('');
    }
    for (const o of result.overrides) {
      lines.push(`- Override of \`${o.blocker}\` by ${o.approvedBy}: ${o.reason}`);
    }
    if (result.overrides.length) lines.push('');
  }

  lines.push('<details><summary>Metadata</summary>', '');
  lines.push(`- Stage: ${result.stage}`);
  lines.push(`- Classification: ${result.classification}`);
  if (result.applicable) {
    lines.push(`- Subtotal: ${result.subtotal}`);
    lines.push(`- Cap: ${result.cap === null ? 'none' : result.cap}`);
  }
  lines.push(`- Rubric version: ${result.rubricVersion}`);
  lines.push(`- Evidence fingerprint: ${result.fingerprint}`);
  lines.push(`- Inaccessible evidence: ${result.inaccessibleEvidence.length ? result.inaccessibleEvidence.join(', ') : 'none'}`);
  lines.push('', '</details>');
  return lines.join('\n');
}

module.exports = {
  RUBRIC_VERSION,
  DIMENSIONS,
  BLOCKERS,
  BANDS,
  ReadinessInputError,
  evidenceFingerprint,
  scoreTicket,
  isApprovalFresh,
  formatReport,
};
