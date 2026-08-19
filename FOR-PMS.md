# For Product Managers — Agentic-First Projects

> This file is written for PMs who are working with an agentic-first codebase. No coding knowledge required. It explains what agents, workflows, slices, and ADRs mean in plain English — and what your job is in this system.

---

## What Is an Agent-First Project?

Instead of engineers writing all the code manually, AI agents (Rovo Dev) write significant portions of it. You define **what** needs to be built. The agent figures out **how**.

Your job changes in two important ways:
1. **Before:** You write requirements. Now you write requirements **as tests** — the agent uses failing tests as its definition of done.
2. **During:** Instead of waiting for a demo, you review **artifacts** (the agent's output) at **human checkpoints** and approve or send back for revision.

---

## The 5 Things PMs Own in an Agentic Project

### 1. Acceptance Criteria (The Agent's Definition of Done)
The most important thing you'll do. For each story, you write specific, measurable acceptance criteria. An engineer converts these into tests. The agent makes the tests pass.

**Bad acceptance criteria (vague):**
> "The search should work well and be fast"

**Good acceptance criteria (testable):**
> - Search results appear in under 500ms for queries up to 50 characters
> - Results are sorted by relevance score (highest first)
> - Searching for a misspelled term returns results with spelling suggestions
> - Searching with no results shows "No results found" — not an empty screen

### 2. Story Descriptions
Your story description is injected directly into the agent's prompt. The clearer and more specific it is, the better the agent's output.

**Include in every story:**
- What the user is trying to accomplish (not how to implement it)
- What success looks like from the user's perspective
- Edge cases and error states
- What's explicitly out of scope (prevents scope creep)

### 3. Human Checkpoint Reviews
At key stages, the workflow pauses and shows you what the agent produced — before any action is taken. You review it and either approve or send back.

**Your checklist at each checkpoint:**
- Does this match the acceptance criteria I wrote?
- Is there anything that would confuse or mislead a user?
- Is there any PII or sensitive data that shouldn't be here?
- Is the output complete (not truncated mid-sentence)?

If yes to all → ✅ **Approve**  
If no to any → 🔄 **Bounce back** with specific feedback

**Specific feedback means:**
> "The error message on line 3 says 'An error occurred' — it should tell the user what to do next, like 'Try again or contact support at...'"

**Not specific enough:**
> "The UX isn't right"

### 4. ADR Reviews (Architecture Decision Records)
ADRs document key decisions the team makes before building. You don't write the code, but you DO need to understand and agree to the decisions in:
- **ADR-009** (Human Checkpoint Approval) — You are named in this as an approver
- **ADR-010** (PII Handling) — You are responsible for identifying what data in your feature is PII

You don't need to understand the technical ADRs (ADR-001 through ADR-008) in detail — just know they exist and your tech lead owns them.

### 5. Stale Story Triage
Some stories become stale — the problem they were solving has already been solved elsewhere, or priorities changed. You need to regularly review the board and mark stale stories as Done (so agents don't waste time on them).

Signs a story is stale:
- The feature already exists in the product
- The dependency it was waiting on was cancelled
- The business context that motivated it has changed

---

## Plain-English Glossary

| Term | What it means to you |
|------|---------------------|
| **Agent** | An AI (Rovo Dev) that writes code, creates documents, or does research on your behalf |
| **Workflow** | A sequence of stages that an agent works through to complete a story. Like a recipe. |
| **Stage** | One step in the workflow. E.g. "Plan → Execute → Review" is 3 stages. |
| **Human Checkpoint** | A pause in the workflow where YOU review what the agent produced and decide whether to approve or send back |
| **Artifact** | The output of a stage — could be code, a design document, a test report, or a script |
| **Bounce back** | Sending an artifact back to the agent with feedback, so it tries again |
| **Bounce limit** | The maximum number of times an agent can retry before it escalates to a human for help |
| **Slice** | A feature area in the codebase. Each slice has clear boundaries — agents only touch their assigned slice. Like lanes in a swimming pool. |
| **ADR** | Architecture Decision Record — a document that explains a technical decision the team made, why they made it, and what the trade-offs are |
| **context.md** | A file that tells agents everything they need to know about a feature slice before they start working. Like a briefing document. |
| **Vibe mode** | Fully autonomous mode — the agent moves through all stages automatically without asking for input. Human checkpoints still pause it. |
| **Escalation** | When an agent has tried and failed (hit the bounce limit), it flags the story as "Needs Attention" and a human must decide what to do next |

---

## The 3 Questions PMs Must Answer Before Any Story Goes to an Agent

1. **What does "done" look like, specifically?**
   Write it as a checklist a non-technical person could verify. This becomes the acceptance criteria.

2. **What data will this feature access or store?**
   If the answer includes any of: names, emails, feedback, decisions, compensation, health → flag it for ADR-010 (PII review).

3. **Who needs to review the output at each checkpoint?**
   Name the roles (Tech Lead, PM, Security) — not specific people. Fill in ADR-009.

---

## When Something Goes Wrong

### "The agent produced something completely wrong"
→ Write specific feedback about what's wrong and bounce it back. The more specific, the better the retry.

### "The agent keeps producing the same wrong thing after 3 bounces"
→ The story has escalated. It's now "Needs Attention" on the board. Pair with the tech lead to rewrite the acceptance criteria or context.md.

### "I don't understand what the agent produced"
→ This is a valid concern. Ask the tech lead to explain the artifact. If it can't be explained in plain English, it's probably wrong.

### "The agent hasn't moved in hours"
→ The workflow ticker may have stalled. Tell the tech lead — they can check if the Rovo Dev session needs to be re-adopted.

---

## Your One-Page Checklist

**Before a sprint (per story):**
- [ ] Acceptance criteria written — specific and measurable
- [ ] Story description includes: user goal, success state, edge cases, out-of-scope
- [ ] PII check done — any sensitive data identified and flagged for ADR-010
- [ ] Checkpoint approvers identified for ADR-009

**During a sprint (at each checkpoint):**
- [ ] Read the acceptance criteria before reviewing the artifact
- [ ] Use the checkpoint review checklist (from ADR-009)
- [ ] Approve only if ALL checklist items pass
- [ ] If bouncing: write specific, actionable feedback (not "it's wrong")

**End of sprint:**
- [ ] Mark stale stories as Done
- [ ] Review any escalated ("Needs Attention") stories with tech lead
- [ ] Update acceptance criteria for stories that needed multiple bounces — they were probably under-specified
