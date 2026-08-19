# 🚀 Next Idea — Agentic-First Project Template

> **Born from real agentic-first delivery lessons** — this template has everything pre-wired so your next idea starts right.

---

## What's In This Template

```
templates/next-idea/
├── AGENTS.md                          ← Agent operating procedure (read before every task)
├── .context.md                        ← Global constraints and invariants
├── map.md                             ← Full codebase map with slice locations
├── docs/
│   └── adr/
│       ├── ADR-001-session-architecture.md    ← How to manage AI sessions
│       ├── ADR-002-database.md                ← DB choice and constraints
│       ├── ADR-003-no-mock-data.md            ← Enforced: zero mock data in production
│       └── ADR-004-agentic-first-slices.md    ← Vertical slice architecture
├── prompts/
│   └── gold-standard-prompt.md        ← 6 battle-tested prompt templates
├── workflows/
│   ├── plan-execute-review.json       ← Standard coding workflow (3 stages)
│   └── design-with-nfr-flow.json     ← Full design workflow (7 stages, 1 human checkpoint)
└── src/
    └── agents/
        └── slice-context-template.md  ← Template for per-slice context.md files
```

---

## 🏁 How to Start Your Next Idea

Follow these steps in order. Don't skip ahead — each step unblocks the next.

### Step 1 — Copy the Template (5 mins)
```bash
# From this repository root
cp -r templates/next-idea /path/to/your-new-project

# Or scaffold directly into an existing project
cp templates/next-idea/AGENTS.md .
cp templates/next-idea/.context.md .
cp templates/next-idea/map.md .
cp -r templates/next-idea/docs ./docs
cp -r templates/next-idea/prompts ./prompts
cp -r templates/next-idea/workflows ./workflows
cp templates/next-idea/src/agents/slice-context-template.md src/agents/
```

### Step 2 — Fill in the Blanks (30 mins)
Open each file and replace every `[BRACKET]` placeholder:
```bash
# Find all placeholders
grep -r "\[YOUR PROJECT" . --include="*.md"
grep -r "\[SLICE" . --include="*.md"
grep -r "\[ROLE\]" . --include="*.md"
```

Fill in:
- `AGENTS.md` → your stack, commands, never-do rules specific to your project
- `.context.md` → your project name, purpose, tech stack, env vars
- `map.md` → your actual slice names, file paths, API routes, DB tables

### Step 3 — Write Your ADRs (1 hour)
Start with the 4 template ADRs — fill in your decisions:
1. **ADR-001** — Choose your session architecture: shared / pool / isolated
2. **ADR-002** — Confirm your database and document the constraints
3. ADR-003 and ADR-004 are pre-filled — review and adjust if needed

### Step 4 — Define Your Slices (1 hour)
For each feature area in your project:
1. Copy `src/agents/slice-context-template.md` → `src/[slice]/context.md`
2. Fill in: purpose, key files, domain rules, inputs/outputs, ADR references
3. Add the slice to `map.md`

### Step 5 — Write Tests from PRD (2 hours per slice)
**This is the most important step.** Write failing tests before any agent touches code:
```bash
# Create test file for each slice
touch src/backend/routes/[slice].test.js

# Write tests that encode the acceptance criteria from your PRD
# These become the agent's unambiguous definition of done
```

### Step 6 — Wire Up the Environment
```bash
cp .env.example .env
# Fill in all values — no placeholders in .env

npm run setup        # Init DB schema
npm run test:all     # Verify all tests run (they should fail — that's correct)
```

### Step 7 — Start Rovo Dev
```bash
# Always on port 9050 — never change this
acli rovodev serve 9050

# Verify it's healthy
curl http://localhost:9050/healthcheck

# Start your server
node server.js

# Adopt the Rovo Dev session
curl -X POST http://localhost:4000/api/rovodev/global-start
```

### Step 8 — Create Your First Story and Run It
```bash
# Via the UI at http://localhost:4000
# 1. Create a story with jira_key, title, and description
# 2. Assign workflow: plan-execute-review (for coding) or design-with-nfr-flow (for design)
# 3. Click "Start Workflow" or via API:

curl -X POST http://localhost:4000/api/workflow-runs \
  -H "Content-Type: application/json" \
  -d '{"story_id": 1, "workflow_key": "plan-execute-review"}'
```

### Step 9 — Watch and Review
- Open the board at `http://localhost:4000`
- The agent will plan → execute → raise a PR automatically
- Review the PR when it appears — check the artifact in the WorkflowRunPanel
- Approve or bounce back (max 3 bounces before escalation)

### ⚠️ Common Pitfalls (From Lesson #1 and #2)
```
❌ Don't run more stories than your session pool supports — they'll queue and stall
❌ Don't use GlobalServeManager.chat() for background tasks — use prompt_mode=replace  
❌ Don't start on port 9051 — always adopt 9050 first
❌ Don't skip context.md — agents without it touch the wrong files
❌ Don't assign stories before writing the failing tests
```

---

## Day 1 Checklist

Copy this checklist and complete it **before** assigning any stories to agents:

### Setup (30 minutes)
- [ ] Copy this template to your project root
- [ ] Fill in all `[YOUR PROJECT NAME]` and `[BRACKET]` placeholders in:
  - `AGENTS.md`
  - `.context.md`
  - `map.md`
- [ ] Create `src/database/connection.js` — single DB connection module
- [ ] Create `.env.example` — document every required env var
- [ ] Add ESLint rule for no mock data patterns

### Architecture (1 hour)
- [ ] Write `ADR-001` — decide your session architecture (shared / pool / isolated)
- [ ] Write `ADR-002` — confirm your DB choice
- [ ] Create `map.md` with your actual slice names and file paths
- [ ] Write `context.md` for each slice using `src/agents/slice-context-template.md`

### For Each Slice (Before First Agent Task)
- [ ] Write failing tests from PRD acceptance criteria
- [ ] Fill in `context.md` for the slice
- [ ] Reference the ADRs the agent needs to read
- [ ] Verify the slice's DB table schema is in `src/database/setup.js`

### Workflow Setup
- [ ] Customise `plan-execute-review.json` with your tech stack (replace `{{tech_stack}}`)
- [ ] Customise `design-with-nfr-flow.json` with your component names
- [ ] Test that `GlobalServeManager` adopts on port 9050 before launching agent runs

---

## The 3 Rules That Matter Most

### Rule 1 — Write Tests Before Assigning to Agents
An agent with failing tests has an unambiguous done criteria. An agent with a description will optimise for the wrong thing. Always tests first.

### Rule 2 — Use `prompt_mode: 'replace'` for All Background Tasks
If you don't reset context, agents will produce output about the wrong project. This is the #1 failure mode. It's in every workflow spec — don't remove it.

### Rule 3 — Never Ship Mock Data
Write the ESLint rule on day 1. It takes 10 minutes. Finding mock data in production weeks later costs hours and trust.

---

## The Gold Standard Prompt

Every workflow stage should look like this:

```
## CONTEXT RESET — IGNORE ALL PRIOR CONVERSATION

You are a [ROLE] working on [PROJECT]. You are NOT working on [IRRELEVANT PROJECT].

## Your Task
[ONE SENTENCE starting with a verb]

## Context
- Repository: [URL]
- Relevant files: [PATHS]
- ADRs to read: [ADR LIST]
- Prior stage output: [ARTIFACT]
- Acceptance criteria: [SPECIFIC, MEASURABLE CRITERIA]

## Rules
- [SPECIFIC RULE 1]
- Do NOT ask questions
- Do NOT discuss [IRRELEVANT DOMAIN]
- If output > 8000 tokens, split into parts

## Output
Produce [EXACT FORMAT] now. No preamble. Begin immediately.
```

See `prompts/gold-standard-prompt.md` for 6 full templates.

---

## Lessons Learned (The Short Version)

Full post-mortem: included in this starter-kit documentation.

| # | Lesson | Impact |
|---|--------|--------|
| 1 | Context pollution is #1 failure mode | 🔴 Critical |
| 2 | Shared sessions block parallel work | 🔴 Critical |
| 3 | context.md per slice reduces agent errors | 🟢 High |
| 4 | Bounce-back needs fresh context to work | 🟡 Medium |
| 5 | Show artifact before human checkpoint | 🟢 High |
| 6 | JSON output contracts for all AI calls | 🟢 High |
| 7 | Spike every MCP integration before building | 🟡 Medium |
| 8 | Design human checkpoints before automation | 🟡 Medium |
| 9 | Each data source has unique schema quirks | 🟡 Medium |
| 10 | Tests before agents = unambiguous done | 🟢 High |

---

## Quick Reference

```bash
# Start server
node server.js

# Run all tests  
npm run test:all

# Start Rovo Dev (always port 9050)
acli rovodev serve 9050

# Adopt existing Rovo Dev session
curl -X POST http://localhost:4000/api/rovodev/global-start

# Trigger workflow run for a story
curl -X POST http://localhost:4000/api/workflow-runs \
  -H "Content-Type: application/json" \
  -d '{"story_id": 123, "workflow_key": "plan-execute-review"}'
```

---

*Template created from real agentic-first delivery lessons — April 2026.*
