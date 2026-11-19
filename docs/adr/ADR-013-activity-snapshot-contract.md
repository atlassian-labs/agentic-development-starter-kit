# ADR-013 — Keep activity events separate from canonical snapshots

Status: Accepted for the synthetic example only

## Context

A record called “history” can mean different things to its writers and readers.
A writer may append a small event while a latest-state reader expects every row
to be a complete snapshot. A schema-valid sparse event can then erase fields from
that reader's view without overwriting the base record.

This ADR is an illustrative public decision, not a record of a private incident.
Its scope is [examples/activity-snapshot-contract](../../examples/activity-snapshot-contract/).

## Decision

- The canonical owner records complete, immutable snapshots with per-record revisions.
- The event producer sends an event payload only; it does not copy canonical fields.
- Activities use separate storage and reference the latest canonical snapshot.
- Snapshot selection and activity insertion share a transaction. A missing anchor
  rejects the event without partial writes.
- Latest-state readers query only the snapshot table. Null/empty event values do
  not clear canonical fields. Complete snapshot fields cannot be null or blank.
- A decision change must update the implementation and the corresponding tests.

## Traceability

- Local entry point: [context.md](../../examples/activity-snapshot-contract/context.md)
- Affected code: [contract_store.py](../../examples/activity-snapshot-contract/contract_store.py)
- Consumer: `latest_snapshot` in that same file
- Verification: [test_contract.py](../../examples/activity-snapshot-contract/test_contract.py)

The tests persist real SQLite rows, verify the snapshot reader remains unchanged,
check anchor rejection and enforce immutability. A deliberately bad sparse-history
fixture demonstrates the invariant violation without leaving a failing test suite.

## Alternatives and consequences

A single typed history stream can work if every writer/consumer agrees on the
record discriminator and snapshot selection rules. This example chooses separate
tables to make that boundary visible and keep the latest-state query simple.

The tradeoff is an explicit join for a combined timeline and a retention dependency
between events and snapshots. Production authorization, migration, deletion policy,
idempotent retry and downstream consumer compatibility are separate concerns.
The local tests do not prove those properties or guarantee agent compliance.
