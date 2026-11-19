# Activity and snapshot contract example

A standalone, synthetic example of an architectural decision linked to code and
persisted-data tests. It uses Python 3.9+ and the standard-library SQLite driver;
there are no packages to install, network calls, credentials or real records.
The JavaScript application template's stack assumptions do not apply to this example.

From the repository root:

```bash
python3 -m unittest discover -s examples/activity-snapshot-contract -v
```

## The contract

A snapshot is complete canonical state. An activity describes an event and must
not become a sparse replacement snapshot. `record_snapshot` is the canonical
owner's operation. `record_activity` accepts only an event and resolves its anchor
inside the database transaction; its producer does not supply stale canonical fields.

- Complete snapshots require exactly a nonblank title and status. Missing, null,
  blank or extra state fields are rejected; there is no patch/default semantics.
- Activities have a nonblank kind and a JSON object payload. Empty objects, nested
  nulls, empty strings and empty lists are event data, never commands to clear state.
- A missing canonical snapshot rejects the activity without writing it.
- Snapshot rows are immutable; new versions are inserted only by the owner operation.
- The latest-state reader queries snapshots only. Events live in a separate table.

## Follow the decision

[ADR-013](../../docs/adr/ADR-013-activity-snapshot-contract.md) →
[local context](context.md) → [implementation](contract_store.py) →
[contract tests](test_contract.py).

Tests inspect actual SQLite rows and the latest-state reader after writing an
activity. A separate deliberately unsafe legacy fixture stores a sparse history
row; the same invariant assertion rejects it. The overall suite stays green by
asserting that this bad fixture violates the contract. That is a regression
illustration, not a claim that an external production system was tested.

SQLite `BEGIN IMMEDIATE` encloses anchor/version selection and the write. Foreign
keys prevent missing anchors, and triggers reject snapshot mutation. This example
owns its connection/transactions; do not call write methods inside a caller's open
transaction. It is not an authorization system, migration framework or distributed
concurrency proof. Real consumers, retention/deletion needs, retry idempotency and
production database isolation need their own design and tests.
