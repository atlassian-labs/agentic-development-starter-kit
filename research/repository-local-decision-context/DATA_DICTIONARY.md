# Data dictionary

## `data/public_run_results.csv`

| Field | Meaning |
|---|---|
| `public_sequence` | Sequence among released public runs only; not the original global run order |
| `public_run_id` | Deterministic public identifier derived from task, condition, and repeat |
| `task_id` | Public task-card identifier |
| `repository` | Upstream public repository |
| `model_id` | Frozen model snapshot used for the run |
| `repeat` | Prespecified repeat index |
| `condition` | `search-only`, `global-docs`, `local-context`, or `full-workflow` |
| `spec_version` | Corrected benchmark specification |
| `hidden_test_success` | Primary functional outcome |
| `*_violations` | Deterministic secondary-rule counts |
| `tool_calls` | Count recorded by the runner |
| `patch_bytes` | Final patch size; patch content is not released |
| `wall_clock_seconds` | End-to-end run duration |
| `agent_escalation_count` | Structured coder escalation count |
| `reviewer_decisions` | Reviewer decisions without free-text feedback |
| `revision_cycles` | Coder revision cycles after review |

Original run hashes, timestamps, prompts, patches, traces, local paths, and free-text agent/reviewer content are excluded.
