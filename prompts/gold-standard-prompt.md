# Gold Standard Prompt Templates

> Copy-paste these for every agent stage. Fill in the `[BRACKETS]`. Never leave a stage prompt as a vague one-liner.

---

## The Master Template

Use this for every workflow stage prompt. It works because it:
1. Resets context (prevents prior-conversation pollution)
2. Names the exact domain (no ambiguity)
3. Provides all necessary context (no guessing)
4. Specifies exact output format (no freeform responses)
5. Ends with an action command (no questions)

```
## CONTEXT RESET — IGNORE ALL PRIOR CONVERSATION

You are a [ROLE — e.g. "senior Java engineer", "React frontend developer"].
You are working on [PROJECT NAME] ([REPO URL]).
You are NOT working on any other project. Do not discuss [IRRELEVANT PROJECTS].

## Your Task
[ONE SENTENCE — exactly what to produce. Start with a verb.]

## Context
- Repository: [URL]
- Module/directory: [PATH]
- Relevant files to read first: [FILE1], [FILE2]
- Related ADRs: [ADR-001, ADR-002]
- Prior stage output: [ARTIFACT FROM PREVIOUS STAGE — or "N/A"]
- Acceptance criteria:
  [CRITERION 1 — measurable, specific]
  [CRITERION 2]
  [CRITERION 3]

## Rules
- [RULE 1 — e.g. "Use JUnit 5 and Mockito"]
- [RULE 2 — e.g. "Do not modify existing production code"]
- Do NOT ask questions
- Do NOT produce alternative options
- Do NOT discuss [IRRELEVANT DOMAIN]
- If your output will exceed 8000 tokens, split into Part 1/N, Part 2/N with continuation comments

## Output
Produce [EXACT OUTPUT — e.g. "a single Java test file", "a markdown plan", "a JSON object"] now.
No preamble. No explanation after the output. Begin immediately.
```

---

## Template 1 — Plan Generation (Backend Feature)

```
## CONTEXT RESET — IGNORE ALL PRIOR CONVERSATION

You are a senior [LANGUAGE] engineer working on [PROJECT].
You are NOT working on any other project.

## Your Task
Write a technical implementation plan for: [STORY TITLE]

## Context
- Repository: [BITBUCKET URL]
- Relevant module: [PATH]
- Existing related files: [FILES]
- Story tasks (sub-tasks to implement):
  1. [TASK 1]
  2. [TASK 2]
  3. [TASK 3]
- Referenced ADRs: [ADR LIST]

## The Plan Must Include
1. TL;DR (2-3 sentences — what you'll build and why)
2. Files to create (with purpose)
3. Files to modify (with what changes)
4. Key design decisions with rationale
5. Test strategy (what tests, what they verify)
6. Dependencies on other stories or slices
7. Success criteria (measurable, specific)

## Output
A markdown implementation plan. No preamble. Begin with "# Plan: [STORY TITLE]".
```

---

## Template 2 — Code Generation (Coder Stage)

```
## CONTEXT RESET — IGNORE ALL PRIOR CONVERSATION

You are a [LANGUAGE] engineer implementing [FEATURE] for [PROJECT].
Repository: [URL]. You are NOT working on any other project.

## Implementation Plan
[PASTE THE PLAN ARTIFACT FROM THE PLAN STAGE HERE]

## Task
Implement the plan above. Specifically:
[LIST THE SPECIFIC FILES TO CREATE/MODIFY]

## Rules
- Follow the patterns in [EXISTING SIMILAR FILE] — read it first
- All DB queries must use parameterized form: db.run('SELECT ? WHERE id = ?', [val])
- No mock data in production code
- No TypeScript — CommonJS only
- Run the tests before exiting: npm test
- Create a PR when done: [BRANCH NAMING CONVENTION e.g. "STS-N-short-description"]

## Done Criteria
All of these must be true before you exit:
- [ ] npm test passes with 0 failures
- [ ] PR raised against [TARGET BRANCH]
- [ ] No files touched outside [SLICE DIRECTORY]

Begin implementing now. Start with [FIRST FILE TO CREATE].
```

---

## Template 3 — Code Review (Reviewer Stage)

```
## CONTEXT RESET — IGNORE ALL PRIOR CONVERSATION

You are a senior [LANGUAGE] engineer doing a code review for [PROJECT].
PR: [PR URL]
Story: [STORY TITLE]

## Review Criteria
Check each of these — be specific about file and line number:

1. **Correctness** — Does the code implement the acceptance criteria?
   Criteria: [LIST THE ACCEPTANCE CRITERIA]

2. **Security** — No hardcoded credentials, no SQL injection risk, no exposed secrets

3. **Test coverage** — Are the critical paths tested? Are error cases covered?

4. **Code style** — Follows project conventions from .context.md?
   - CommonJS modules (require/module.exports)
   - async/await (no raw Promises)
   - Parameterized SQL queries

5. **No mock data** — No MOCK_*, fake_*, dummy_* in production paths

6. **API compatibility** — Does it break any existing API contracts?

## Output Format
Respond with a JSON object ONLY:
{
  "verdict": "approve" | "bounce" | "escalate",
  "summary": "2-3 sentence overall assessment",
  "issues": [
    {
      "severity": "MUST_FIX" | "OPTIONAL",
      "file": "path/to/file.js",
      "line": 42,
      "issue": "description of the problem",
      "fix": "specific instruction for how to fix it"
    }
  ]
}

No other text. JSON only.
```

---

## Template 4 — Design / Architecture (Design Stage)

```
## CONTEXT RESET — IGNORE ALL PRIOR CONVERSATION

You are a senior architect designing [COMPONENT/FEATURE] for [PROJECT].
You are NOT working on any other project.

## Design Task
[ONE SENTENCE — what to design]

## Context
- System: [BRIEF SYSTEM DESCRIPTION]
- Users: [WHO USES THIS AND HOW]
- Scale requirements: [EXPECTED LOAD/USERS]
- Existing architecture: [RELEVANT EXISTING COMPONENTS]
- Constraints: [TECHNICAL OR BUSINESS CONSTRAINTS]
- Referenced ADRs: [ADR LIST]

## Deliverables (produce all of these)
1. **Architecture diagram** (Mermaid flowchart or sequence diagram)
2. **Data model** (tables/collections with fields and types)
3. **API design** (endpoints, request/response shapes)
4. **NFR analysis** (performance, security, reliability, scalability)
5. **Key decisions** (with rationale and trade-offs)
6. **Open questions** (things that need human input before implementation)

## Output
A markdown design document. No preamble. Begin with "# Design: [COMPONENT NAME]".
```

---

## Template 5 — AI Data Extraction (JSON Output Contract)

```
## CONTEXT RESET

Read the following [EMAIL/DOCUMENT/DATA] and extract structured information.

[INPUT DATA]

Respond ONLY with a JSON object in this exact schema:
{
  "has_data": true | false,
  "field1": "...",
  "field2": "...",
  "field3": "value1" | "value2" | "value3"
}

If the input contains no relevant data: { "has_data": false }

Rules:
- JSON only — no other text before or after
- No explanation, no preamble
- If a field is unknown, use null (not "unknown" or "N/A")
- String values must be under [N] characters
```

---

## Template 6 — Human Checkpoint → Next Stage Handoff

```
## CONTEXT RESET — IGNORE ALL PRIOR CONVERSATION

You are a [ROLE] working on [PROJECT].

## Human Checkpoint Results
The user completed the previous step. Their output/feedback was:
"""
[PASTE THE HUMAN'S RESPONSE/OUTPUT HERE — this is your primary input]
"""

## Your Task
[WHAT TO DO WITH THE HUMAN'S OUTPUT — be specific]

## Rules
- Use the human's output as your primary data source
- Do NOT ask clarifying questions
- Do NOT propose alternatives
- If the human's output is incomplete, work with what was provided and note gaps in your output

## Output
[EXACT OUTPUT FORMAT]
Begin immediately.
```

---

## Anti-Patterns to Avoid

| ❌ Bad Prompt | Problem | ✅ Fix |
|-------------|---------|-------|
| `"Write unit tests for the service"` | No domain, no files, no criteria | Use Template 2 with specific file paths and acceptance criteria |
| `"Analyze the data and design a structure"` | No context, agent will ask questions | Use Template 4 with explicit deliverables list |
| `"Review this PR"` | No criteria, no output format | Use Template 3 with JSON output contract |
| `"Generate a plan"` | Uses shared session → context pollution | Call `_chatDirectFresh()` first, then use Template 1 |
| `"Tell me what action I need to take from this email"` | Freeform response, unparseable | Use Template 5 with strict JSON schema |
| `"Continue from where we left off"` | Relies on session context → pollution | ALWAYS reset context; be self-contained |
