# Exploratory pilot protocol

## Question

Does repository-local decision context, alone or with bounded reviewer interaction, change coding-agent functional success and deterministic secondary-rule compliance relative to search-only access?

## Units and conditions

A run is one task, condition, model snapshot, and repeat. Four conditions were frozen:

1. **search-only**: repository search and inspection without authored decision documents;
2. **global-docs**: search plus repository-wide authored guidance;
3. **local-context**: search plus path-scoped decision context;
4. **full-workflow**: local context plus bounded reviewer decisions and revision cycles.

The primary endpoint is functional hidden-test success. Behavior, architecture, security/privacy, and scope violations are secondary outcomes and never redefine functional success.

## Task and evaluator custody

Task cards were frozen before corrected-v2 execution. The custodian retained hidden checks and validated every evaluator against three states: base fails, reference passes, and seeded fault fails. Public evaluator contracts and the 12 validation records are released in `../evaluators/`.

## Execution and isolation

Assignments were randomized before execution. One frozen model snapshot was used. Each run had bounded tools and wall time. The evaluator ran after the agent session and did not expose hidden outcomes to the agent. Infrastructure failures were excluded and tracked separately; no infrastructure failure entered the 32-run corrected-v2 analysis.

The release contains only the 18 public-task assignments. Their `public_sequence` preserves order among released public runs but does not reveal positions or identifiers of withheld private runs.

## Deviations

Three deviations are material:

- the design changed from two models plus human scoring to one model plus automated hidden tests before durable pilot outcomes;
- seven outcomes from an underspecified version were quarantined after an outcome-visible validity repair and never combined with corrected-v2 results; and
- the corrected-v2 benchmark stopped at 32 rather than 96 outcomes after interim outcomes were visible.

The complete public deviation record is `deviations.csv`. Optional stopping and unbalanced allocation prevent confirmatory causal interpretation.

## Analysis

The release reports counts, proportions, Wilson 95% intervals, violation totals, timing, and task-condition cells. No p-values or confirmatory mixed-effects estimates are claimed. `../analysis/reproduce_results.py` reconstructs the public 18-run summary from the released CSV.

