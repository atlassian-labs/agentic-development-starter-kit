# Reproduction

Requires CPython 3.11 or newer and no third-party packages.

```bash
python3 reproduce_results.py \
  --input ../data/public_run_results.csv \
  --output /tmp/public-summary.json
python3 test_reproduce_results.py
```

Compare `/tmp/public-summary.json` with `../data/aggregate_public_18.json`. Floating-point values are emitted deterministically by the Python standard library. The regression test checks released run/pass counts, selected condition cells, and task count.
