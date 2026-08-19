# Codebase Map — [YOUR PROJECT NAME]

> This is the authoritative map of the codebase. Read it before touching any files. It defines slice boundaries, API contracts, and inter-slice rules.

---

## Project Overview

**[YOUR PROJECT NAME]** — [ONE PARAGRAPH: what it does, who uses it, key capabilities]

**Entry points:**
- `server.js` — Express app (registers all routes, starts DB, initialises services)
- `src/frontend/index.js` — React app root
- `src/database/setup.js` — DB schema initialisation

---

## Vertical Slices

Each slice owns its route, service, frontend component, tests, and context.md. Do not cross slice boundaries without permission.

### 1. [SLICE-NAME-1] — [Short Description]
| Layer | File(s) |
|-------|---------|
| Route | `src/backend/routes/[slice].js` |
| Service | `src/backend/services/[SliceService].js` |
| Frontend | `src/frontend/components/[SliceComponent]/` |
| Tests | `src/backend/routes/[slice].test.js` |
| Context | `src/[slice]/context.md` |

**Owns:** [what data/state this slice owns]  
**Exposes:** `GET /api/[slice]`, `POST /api/[slice]`, `PATCH /api/[slice]/:id`  
**Dependencies:** [other slices or services this slice calls]

---

### 2. [SLICE-NAME-2] — [Short Description]
| Layer | File(s) |
|-------|---------|
| Route | `src/backend/routes/[slice].js` |
| Service | `src/backend/services/[SliceService].js` |
| Frontend | `src/frontend/components/[SliceComponent]/` |
| Tests | `src/backend/routes/[slice].test.js` |
| Context | `src/[slice]/context.md` |

**Owns:** [what data/state this slice owns]  
**Exposes:** [API routes]  
**Dependencies:** [dependencies]

---

### 3. agent-orchestration — Manages AI Agent Sessions
| Layer | File(s) |
|-------|---------|
| Service | `src/backend/services/GlobalServeManager.js` |
| Service | `src/backend/services/RovoAgentService.js` |
| Context | `src/backend/services/slices/agent-orchestration/context.md` |

**Owns:** The Rovo Dev session lifecycle  
**Exposes:** `GlobalServeManager.chat()`, `GlobalServeManager._chatDirectFresh()`, `GlobalServeManager.isReady()`  
**Critical rules:**
- Singleton — one instance per server process
- Always try `adoptExistingInstance()` before starting new
- Port 9050 preferred; never silently fall back to 9051
- Token persisted to `logs/rovodev_token.json`

---

### 4. workflow-engine — Multi-Stage AI Workflow Runs
| Layer | File(s) |
|-------|---------|
| Route | `src/backend/routes/workflowRuns.js` |
| Service | `src/backend/services/WorkflowRunTicker.js` |
| Frontend | `src/frontend/components/WorkflowRunPanel.js` |
| Tests | `src/backend/routes/workflowRuns.test.js` |
| Context | `src/backend/routes/slices/workflow-engine/context.md` |

**Owns:** Workflow run state machine (running → stage_executing → stage_complete → done/failed)  
**Exposes:** `POST /api/workflow-runs`, `POST /api/workflow-runs/:id/execute-current-stage`, `POST /api/workflow-runs/:id/approve`  
**Critical rules:**
- All stage prompts must use `prompt_mode: 'replace'`
- Human checkpoint stages pause run until user approves
- Bounce-back reruns stage with stronger prompt (max `bounce_limit` times)
- Vibe mode auto-advances through non-human stages

---

## Shared Infrastructure

These are shared by all slices — never duplicate or replace them:

| Resource | Location | Notes |
|----------|----------|-------|
| DB connection | `src/database/connection.js` | Use exclusively — never import driver directly |
| DB schema | `src/database/setup.js` | All table definitions live here |
| DB migrations | `src/database/migrations/` | Numbered, never modified after merge |
| Feature flags | `src/frontend/context/FeatureFlagContext.js` | Statsig integration |
| Notification service | `src/frontend/services/NotificationService.js` | Toast/alert system |
| Analytics | `src/backend/services/AnalyticsTicker.js` | Usage event flushing |

---

## Agent Definitions

| Agent | Location | Purpose |
|-------|----------|---------|
| coder | `src/agents/coder/` | Writes code, raises PRs |
| reviewer | `src/agents/reviewer/` | Reviews code quality and acceptance criteria |
| planner | `src/agents/planner/` | Generates technical implementation plans |
| pr-reviewer | `src/agents/pr-reviewer/` | Reviews open PRs in Bitbucket |
| adr-agent | `src/agents/adr-agent/` | Writes Architecture Decision Records |
| api-spec-agent | `src/agents/api-spec-agent/` | Generates OpenAPI specifications |
| diagram-agent | `src/agents/diagram-agent/` | Generates architecture diagrams (Mermaid) |
| confluence-writer | `src/agents/confluence-writer/` | Publishes documentation to Confluence |

---

## Workflow Specs

Workflow specs live in `src/workflows/`. Each spec defines stages, prompts, and human checkpoints.

| Workflow | File | Stages |
|----------|------|--------|
| plan-execute-review | `src/workflows/plan-execute-review.json` | plan → execute → review → done |
| design-flow | `src/workflows/design-flow.json` | brief → explore → design → review |
| design-with-nfr-flow | `src/workflows/design-with-nfr-flow.json` | nfr-analysis → data-model → api-spec → diagrams → adrs → design-doc → review |

---

## Inter-Slice API Contracts

**Critical invariant:** Never break these contracts without a migration plan.

| Contract | Owner | Consumers |
|----------|-------|-----------|
| `GET /api/stories` | story-management | frontend, workflow-engine |
| `GET /api/tasks` | story-management | workflow-engine, agent-orchestration |
| `POST /api/workflow-runs` | workflow-engine | frontend, agent-orchestration |
| `GlobalServeManager.chat()` | agent-orchestration | workflow-engine, planner, multi-source-sync |

---

## Database Schema Summary

Key tables (see `src/database/setup.js` for full schema):

| Table | Owned by | Key fields |
|-------|----------|-----------|
| `stories` | story-management | `id`, `jira_key`, `title`, `status`, `workflow_key` |
| `tasks` | story-management | `id`, `story_id`, `title`, `status`, `sequence_order` |
| `workflow_runs` | workflow-engine | `id`, `story_id`, `workflow_key`, `status`, `current_stage_index` |
| `workflow_artifacts` | workflow-engine | `id`, `run_id`, `stage_name`, `content`, `output_format` |

---

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Route files | camelCase | `workflowRuns.js` |
| Service files | PascalCase | `WorkflowRunTicker.js` |
| Test files | same name + `.test.js` | `workflowRuns.test.js` |
| React components | PascalCase folder + file | `WorkflowRunPanel/WorkflowRunPanel.js` |
| Context files | always `context.md` | `src/backend/routes/slices/planner/context.md` |
| ADR files | `ADR-NNN-short-title.md` | `docs/adr/ADR-001-shared-session.md` |
