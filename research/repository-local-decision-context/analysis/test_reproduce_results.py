#!/usr/bin/env python3
"""Regression checks for the released public-subset summary."""
from pathlib import Path
from reproduce_results import load_rows, summarize

ROOT = Path(__file__).resolve().parents[1]
RESULT = summarize(load_rows(ROOT / "data" / "public_run_results.csv"))
assert RESULT["overall"]["runs"] == 18
assert RESULT["overall"]["passes"] == 10
assert RESULT["by_condition"]["search-only"]["runs"] == 4
assert RESULT["by_condition"]["search-only"]["passes"] == 1
assert RESULT["by_condition"]["local-context"]["runs"] == 7
assert RESULT["by_condition"]["local-context"]["passes"] == 5
assert len(RESULT["task_condition_matrix"]) == 4
full = [row for row in load_rows(ROOT / "data" / "public_run_results.csv") if row["condition"] == "full-workflow"]
assert len(full) == 2 and all(row["reviewer_decisions"] == "ESCALATE" for row in full)
print("public result reproduction: PASS")
