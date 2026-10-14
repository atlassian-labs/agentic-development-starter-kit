#!/usr/bin/env python3
"""Reproduce descriptive summaries from the released public-run CSV."""
from __future__ import annotations
import argparse
import csv
import json
import math
from collections import defaultdict
from pathlib import Path

CONDITIONS = ("search-only", "global-docs", "local-context", "full-workflow")
VIOLATIONS = (
    "behavior_violations",
    "architecture_violations",
    "security_privacy_violations",
    "scope_violations",
)


def wilson(passes: int, runs: int) -> list[float]:
    """Return the Wilson 95% interval for a binomial proportion."""
    z = 1.959963984540054
    p = passes / runs
    d = 1 + z * z / runs
    c = (p + z * z / (2 * runs)) / d
    h = z * math.sqrt(p * (1 - p) / runs + z * z / (4 * runs * runs)) / d
    return [c - h, c + h]

def load_rows(path: Path) -> list[dict]:
    """Load and type-check released run records."""
    rows = list(csv.DictReader(path.open(newline="", encoding="utf-8")))
    if not rows:
        raise ValueError("No run records found")
    for row in rows:
        if not row["task_id"].startswith("PUB-"):
            raise ValueError("Non-public task record found")
        row["hidden_test_success"] = row["hidden_test_success"].lower() == "true"
        for key in VIOLATIONS:
            row[key] = int(row[key])
        row["wall_clock_seconds"] = float(row["wall_clock_seconds"])
    return rows


def summarize(rows: list[dict]) -> dict:
    """Compute counts, Wilson intervals, violations, timing, and task cells."""
    by_condition: dict[str, list[dict]] = defaultdict(list)
    by_task: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        by_condition[row["condition"]].append(row)
        by_task[row["task_id"]].append(row)

    def group_summary(group: list[dict]) -> dict:
        n = len(group)
        passed = sum(r["hidden_test_success"] for r in group)
        times = sorted(r["wall_clock_seconds"] for r in group)
        return {
            "runs": n,
            "passes": passed,
            "pass_rate": passed / n,
            "pass_rate_wilson_95": wilson(passed, n),
            "violation_totals": {k: sum(r[k] for r in group) for k in VIOLATIONS},
            "wall_clock_seconds": {"mean": sum(times) / n, "median": (times[(n-1)//2] + times[n//2]) / 2},
        }

    matrix = {}
    for task, task_rows in sorted(by_task.items()):
        matrix[task] = {}
        for condition in CONDITIONS:
            cell = [r for r in task_rows if r["condition"] == condition]
            matrix[task][condition] = {
                "runs": len(cell),
                "passes": sum(r["hidden_test_success"] for r in cell),
            }
    return {
        "release_scope": "18 public corrected-v2 outcomes",
        "confirmatory_claim_permitted": False,
        "overall": group_summary(rows),
        "by_condition": {
            condition: group_summary(by_condition[condition])
            for condition in CONDITIONS if by_condition[condition]
        },
        "task_condition_matrix": matrix,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = summarize(load_rows(args.input))
    text = json.dumps(result, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.write_text(text, encoding="utf-8")
    else:
        print(text, end="")


if __name__ == "__main__":
    main()

