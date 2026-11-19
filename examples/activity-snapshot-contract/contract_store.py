"""Local illustrative store. Contract/rationale: ../../docs/adr/ADR-013-activity-snapshot-contract.md.

Only the canonical owner's operation records a new complete snapshot. Event payloads
never supply or replace canonical state. Tests use real SQLite tables, not mocks.
"""
import json
import sqlite3


def require_text(value, name):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{name} must be non-empty text")


class ContractStore:
    def __init__(self, database=":memory:"):
        self.connection = sqlite3.connect(database)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA foreign_keys = ON")
        self.connection.executescript("""
            CREATE TABLE IF NOT EXISTS snapshots (
                id INTEGER PRIMARY KEY,
                record_key TEXT NOT NULL CHECK(length(trim(record_key)) > 0),
                revision INTEGER NOT NULL CHECK(revision > 0),
                title TEXT NOT NULL CHECK(length(trim(title)) > 0),
                status TEXT NOT NULL CHECK(length(trim(status)) > 0),
                UNIQUE(record_key, revision)
            );
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY,
                snapshot_id INTEGER NOT NULL REFERENCES snapshots(id),
                kind TEXT NOT NULL CHECK(length(trim(kind)) > 0),
                payload TEXT NOT NULL
            );
            CREATE TRIGGER IF NOT EXISTS immutable_snapshot_update
                BEFORE UPDATE ON snapshots BEGIN
                    SELECT RAISE(ABORT, 'canonical snapshots are immutable');
                END;
            CREATE TRIGGER IF NOT EXISTS immutable_snapshot_delete
                BEFORE DELETE ON snapshots BEGIN
                    SELECT RAISE(ABORT, 'canonical snapshots are immutable');
                END;
        """)

    def close(self):
        self.connection.close()

    def record_snapshot(self, record_key, state):
        """Canonical-owner operation: complete state, never a partial event."""
        require_text(record_key, "record_key")
        if not isinstance(state, dict) or set(state) != {"title", "status"}:
            raise ValueError("snapshot requires exactly title and status")
        require_text(state["title"], "title")
        require_text(state["status"], "status")
        # Serialize version allocation and insertion within this local database.
        with self.connection:
            self.connection.execute("BEGIN IMMEDIATE")
            revision = self.connection.execute(
                "SELECT COALESCE(MAX(revision), 0) + 1 FROM snapshots WHERE record_key = ?",
                (record_key,),
            ).fetchone()[0]
            row = self.connection.execute(
                "INSERT INTO snapshots(record_key, revision, title, status) VALUES (?, ?, ?, ?)",
                (record_key, revision, state["title"], state["status"]),
            )
            return row.lastrowid

    def record_activity(self, record_key, kind, payload):
        """Record an event anchored to current state without mutating that state."""
        require_text(record_key, "record_key")
        require_text(kind, "kind")
        if not isinstance(payload, dict):
            raise ValueError("activity payload must be a JSON object")
        try:
            serialized = json.dumps(payload, allow_nan=False)
        except (TypeError, ValueError) as error:
            raise ValueError("activity payload must contain finite JSON values") from error
        with self.connection:
            self.connection.execute("BEGIN IMMEDIATE")
            snapshot = self.latest_snapshot(record_key)
            if snapshot is None:
                raise ValueError("activity requires a canonical snapshot")
            row = self.connection.execute(
                "INSERT INTO activities(snapshot_id, kind, payload) VALUES (?, ?, ?)",
                (snapshot["id"], kind, serialized),
            )
            return row.lastrowid

    def snapshots(self, record_key):
        require_text(record_key, "record_key")
        rows = self.connection.execute(
            "SELECT * FROM snapshots WHERE record_key = ? ORDER BY revision", (record_key,)
        )
        return [dict(row) for row in rows]

    def latest_snapshot(self, record_key):
        require_text(record_key, "record_key")
        row = self.connection.execute(
            "SELECT * FROM snapshots WHERE record_key = ? ORDER BY revision DESC LIMIT 1", (record_key,)
        ).fetchone()
        return dict(row) if row is not None else None
