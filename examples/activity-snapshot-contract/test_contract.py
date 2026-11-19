"""Synthetic persisted-data contract tests; no external systems or real records."""
import sqlite3
import unittest

from contract_store import ContractStore


class ActivitySnapshotContractTest(unittest.TestCase):
    def setUp(self):
        self.store = ContractStore()
        self.addCleanup(self.store.close)
        self.store.record_snapshot("record-a", {"title": "Example", "status": "Open"})

    def assert_snapshot_contract(self, rows, expected):
        self.assertEqual(rows, expected, "activity must not modify canonical history")
        self.assertTrue(all(row["status"] for row in rows), "snapshots must be complete")

    def test_activity_preserves_persisted_history_and_latest_state(self):
        before = self.store.snapshots("record-a")
        latest = self.store.latest_snapshot("record-a")
        event_id = self.store.record_activity("record-a", "note-added", {"note": "Synthetic"})
        self.assert_snapshot_contract(self.store.snapshots("record-a"), before)
        self.assertEqual(self.store.latest_snapshot("record-a"), latest)
        row = self.store.connection.execute(
            "SELECT id, snapshot_id, kind, payload FROM activities WHERE id = ?", (event_id,)
        ).fetchone()
        self.assertEqual(row["snapshot_id"], latest["id"])
        self.assertEqual(row["kind"], "note-added")
        self.assertIn("Synthetic", row["payload"])

    def test_only_owner_operation_adds_snapshot_and_activity_anchors_latest(self):
        first = self.store.record_activity("record-a", "viewed", {})
        self.store.record_snapshot("record-a", {"title": "Renamed", "status": "Closed"})
        second = self.store.record_activity("record-a", "viewed", {})
        rows = self.store.snapshots("record-a")
        self.assertEqual([row["revision"] for row in rows], [1, 2])
        anchors = dict(self.store.connection.execute("SELECT id, snapshot_id FROM activities"))
        self.assertEqual(anchors[first], rows[0]["id"])
        self.assertEqual(anchors[second], rows[1]["id"])
        self.assertEqual(self.store.latest_snapshot("record-a")["status"], "Closed")

    def test_missing_anchor_rejected_without_partial_writes(self):
        before = self.store.connection.total_changes
        with self.assertRaises(ValueError):
            self.store.record_activity("unknown", "viewed", {})
        self.assertEqual(self.store.connection.total_changes, before)
        self.assertEqual(self.store.connection.execute("SELECT COUNT(*) FROM activities").fetchone()[0], 0)

    def test_invalid_inputs_leave_both_tables_unchanged(self):
        before = self.store.snapshots("record-a")
        invalid_events = [(None, "viewed", {}), ("", "viewed", {}),
                          ("record-a", " ", {}), ("record-a", "viewed", None),
                          ("record-a", "viewed", []), ("record-a", "viewed", {"v": float("nan")})]
        for args in invalid_events:
            with self.subTest(args=args), self.assertRaises(ValueError):
                self.store.record_activity(*args)
        for state in [None, {}, {"title": "New"}, {"title": "New", "status": None},
                      {"title": "New", "status": " "}, {"title": "", "status": "Open"},
                      {"title": "New", "status": "Open", "extra": True}]:
            with self.subTest(state=state), self.assertRaises(ValueError):
                self.store.record_snapshot("record-a", state)
        self.assert_snapshot_contract(self.store.snapshots("record-a"), before)
        self.assertEqual(self.store.connection.execute("SELECT COUNT(*) FROM activities").fetchone()[0], 0)

    def test_event_values_cannot_overwrite_state(self):
        before = self.store.latest_snapshot("record-a")
        self.store.record_activity("record-a", "annotated", {"status": None, "tags": [], "text": ""})
        self.assertEqual(self.store.latest_snapshot("record-a"), before)

    def test_snapshot_immutability_and_anchor_are_database_constraints(self):
        with self.assertRaises(sqlite3.IntegrityError), self.store.connection:
            self.store.connection.execute("UPDATE snapshots SET status = 'Changed'")
        with self.assertRaises(sqlite3.IntegrityError), self.store.connection:
            self.store.connection.execute("DELETE FROM snapshots")
        with self.assertRaises(sqlite3.IntegrityError), self.store.connection:
            self.store.connection.execute(
                "INSERT INTO activities(snapshot_id, kind, payload) VALUES (?, ?, ?)",
                (999, "viewed", "{}"),
            )
        self.assertEqual(self.store.latest_snapshot("record-a")["status"], "Open")

    def test_records_have_independent_revisions_and_anchors(self):
        self.store.record_snapshot("record-b", {"title": "Other", "status": "Open"})
        self.store.record_activity("record-b", "viewed", {})
        self.assertEqual(len(self.store.snapshots("record-a")), 1)
        self.assertEqual(self.store.latest_snapshot("record-b")["revision"], 1)
        self.assertIsNone(self.store.latest_snapshot("missing"))

    def test_old_sparse_write_fixture_violates_the_same_contract(self):
        # Deliberately unsafe legacy shape, confined to a separate synthetic DB.
        with sqlite3.connect(":memory:") as legacy:
            legacy.row_factory = sqlite3.Row
            legacy.execute("CREATE TABLE history (revision INTEGER, status TEXT)")
            legacy.execute("INSERT INTO history VALUES (1, 'Open')")
            before = [dict(row) for row in legacy.execute("SELECT * FROM history ORDER BY revision")]
            legacy.execute("INSERT INTO history VALUES (2, '')")
            after = [dict(row) for row in legacy.execute("SELECT * FROM history ORDER BY revision")]
            with self.assertRaises(AssertionError):
                self.assert_snapshot_contract(after, before)
            self.assertEqual(legacy.execute("SELECT status FROM history ORDER BY revision DESC LIMIT 1").fetchone()[0], "")


if __name__ == "__main__":
    unittest.main()
