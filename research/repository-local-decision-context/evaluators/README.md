# Public evaluator contracts

`public_evaluator_manifest.json` records the public base commits, hidden-test commands, allowed path prefixes, and rule identifiers used by corrected-v2 evaluation. Machine-local repository names, environment paths, gold-patch paths, and hidden-patch paths were removed.

`validation_summary.json` contains 12 sanitized validation records: base, reference, and seeded-fault evaluations for each of four public tasks. The required contract holds for every task:

| State | Expected functional result |
|---|---|
| Base commit | Fail |
| Reference patch | Pass |
| Seeded fault | Fail |

Free-text command output was excluded because it contained machine-local paths. Structured command, rule status, exit code, violations, changed files, and manifest hashes were retained.

The release does not distribute upstream source trees, gold patches, hidden test patches, or submitted agent patches. Task provenance and upstream commits are in `../tasks/`.
