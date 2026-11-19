# Activity/snapshot example context

## Scope and owner

This example owns its SQLite connection, schema and transaction boundaries.
The canonical-state owner uses `record_snapshot`; an event producer uses
`record_activity`. API authorization between those roles is outside this example.

## Decision → code → tests

| Decision | Implementation | Verification |
| --- | --- | --- |
| [ADR-013: separate events from snapshots](../../docs/adr/ADR-013-activity-snapshot-contract.md) | [ContractStore](contract_store.py) | [persisted-data tests](test_contract.py) |
| Events never replace canonical fields | `record_activity`, separate `activities` table | `test_activity_preserves_persisted_history_and_latest_state`, `test_event_values_cannot_overwrite_state` |
| Anchor and write are atomic | `BEGIN IMMEDIATE`, snapshot lookup, FK | `test_missing_anchor_rejected_without_partial_writes` |
| Snapshots are complete, versioned and immutable | `record_snapshot`, constraints/triggers | validation, revision and direct SQL constraint tests |

The latest-snapshot reader is the modeled consumer. Downstream analytics or CDC
systems are not present and are not claimed to be tested.

## Verification

Run `python3 -m unittest discover -s examples/activity-snapshot-contract -v` from
repository root. No external services or environment settings are needed.
Tests document the current contract; review ADR/code/test changes together.

Stop if a new requirement needs partial snapshots, mutable history or a different
consumer selection rule. Record an explicit design/migration decision first;
do not silently interpret missing/null event fields as canonical state updates.
