# Repository-Local Decision Context for Software Agents

Public study artifacts for an exploratory benchmark of repository-local decision context and bounded reviewer interaction in coding-agent workflows.

- **Version:** 1.0.0
- **Reserved DOI:** [10.5281/zenodo.22885563](https://doi.org/10.5281/zenodo.22885563)
- **Status:** PR-ready staging package; the Zenodo record is not yet public
- **License:** MIT for original code and documentation; see `THIRD_PARTY_NOTICES.md`

## Released evidence

This directory contains:

- four public SWE-bench Verified task cards;
- 18 de-identified corrected-v2 public run records;
- aggregate summaries for the public subset and the complete 32-run pilot;
- public evaluator specifications and base/reference/fault validation summaries;
- the frozen protocol, deviations, and specification-repair record; and
- dependency-free Python analysis code with regression checks.

The full pilot had 32 durable outcomes and 18 functional passes. The released public subset has 18 outcomes and 10 passes. These are exploratory descriptive results, not confirmatory treatment-effect estimates.

## Reproduce the public-subset summary

From this directory:

```bash
python3 analysis/reproduce_results.py \
  --input data/public_run_results.csv \
  --output /tmp/public-summary.json
python3 analysis/test_reproduce_results.py
```

The script uses only the Python standard library. `data/aggregate_public_18.json` is the checked-in expected output. `data/aggregate_all_32.json` reports the paper's 32-run aggregate but cannot be reconstructed from public run records alone because 14 private-task records are intentionally withheld.

## Release boundary

Included content is public-source metadata, de-identified measurements, deterministic evaluation specifications, aggregate findings approved for publication, and original analysis code. The package excludes internal repositories, internal task descriptions or identifiers, original private run IDs, prompts, authored context bundles, patches, execution traces, free-text feedback, local filesystem paths, credentials, and employee data.

The four public tasks retain upstream provenance and licensing. No upstream repository source code is redistributed.

## Directory map

- `tasks/`: public task cards and upstream commit provenance
- `evaluators/`: sanitized evaluator contracts and validation summaries
- `data/`: de-identified run records and aggregate results
- `protocol/`: frozen design, public assignments, deviations, and repair record
- `analysis/`: reproduction script and regression checks
- `LICENSES/`: applicable third-party license text

## Citation

```text
Bableshwar, P. (2026). Repository-Local Decision Context for Software
Agents: Public Study Artifacts (Version 1.0.0). Zenodo.
https://doi.org/10.5281/zenodo.22885563
```

See `CITATION.cff` for machine-readable metadata.

## Limitations

The pilot stopped after 32 of 96 planned corrected-v2 outcomes after interim outcomes were visible. Task-condition cells are unbalanced, only one model snapshot was used, and 14 private-task run records cannot be released. The data support transparent exploratory analysis, not an unbiased population treatment-effect claim.

