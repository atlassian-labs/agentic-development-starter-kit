#!/usr/bin/env node
'use strict';

// Usage: node bin/score.js <analyzer-output.json> [--json]
// Reads the structured ratings an analyzer agent produced for one ticket and
// prints the deterministic score as a Jira-ready Markdown comment.

const fs = require('node:fs');
const { scoreTicket, formatReport, ReadinessInputError } = require('../src/score');

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('Usage: node bin/score.js <analyzer-output.json> [--json]');
  process.exit(2);
}

try {
  const result = scoreTicket(JSON.parse(fs.readFileSync(file, 'utf8')));
  console.log(args.includes('--json') ? JSON.stringify(result, null, 2) : formatReport(result));
} catch (error) {
  if (error instanceof ReadinessInputError || error instanceof SyntaxError) {
    console.error(`No score produced: ${error.message}`);
    process.exit(1);
  }
  throw error;
}
