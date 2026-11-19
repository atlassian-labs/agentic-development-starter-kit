# [SLICE NAME] — Context

> **Read this file before writing any code for this slice.** It defines domain rules, boundaries, and invariants that all agents must follow.

---

## Domain Rules & Decision Traceability

### Decision → Affected Files → Test Traceability

For each core decision, state:
- **Decision:** What architectural or behavioral choice was made?
- **Source / ADR:** [repository-relative ADR link; original source if known]
- **Owner:** [team or role that can approve changing this contract]
- **Last verified:** [date, canonical branch and inspected commit; record unknowns]
- **Why:** What problem does it solve?
- **Affected Files:** Which code files encode this decision?
- **Test Traceability:** Which test case verifies this invariant holds?
- **Impact of Violation:** What breaks if violated?

**Example:**
- **Decision:** All database writes use parameterized queries (no string interpolation)
- **Why:** SQL injection prevention (per security & compliance rules)
- **Affected Files:** `src/backend/routes/[slice].js`, `src/backend/services/[SliceService].js`
- **Test Traceability:** `[slice].test.js` — "malicious input does not alter query logic"
- **Impact:** SQL injection vulnerability in production

---

## State Management & Event Semantics

### Event / Snapshot / Patch Distinction
1. **Event Model:** Does this slice emit events (state change notifications)? Yes/No
2. **Snapshot Model:** Does this slice store snapshots of past state? Yes/No
3. **Patch Model:** Does this slice use incremental patches for updates? Yes/No

### Absent / Null Semantics
Clarify the semantic difference between absent, null, and empty values:
- **Omitted Field:** [No change, default, or invalid? Define per payload operation.]
- **Absent/Missing Record:** [What does it mean if a record is not found?]
- **Null Field:** [For each nullable field, state: does `NULL` mean "not set", "unknown", "disabled", or "error state"?]
- **Empty String (`""`):** [Is empty string treated as distinct from `null`?]
- **Empty Array/List:** [What does an empty collection mean?]
- **Zero Value (0, 0.0):** [Is 0 different from `null`?]

**Guideline:** If the meaning changes, STOP and escalate with evidence before proceeding.

### Source Commit Verification
If this slice reads state from an inspected repository or external service:
- [ ] Inspected repository URL and branch/tag are documented
- [ ] Expected schema/contract version is documented
- [ ] Source commit hash at inspection time is logged (for audit traceability)
- [ ] Mismatch between expected version and actual source triggers [action: error | warn | escalate]
- [ ] NOTE: "Source commit" refers to inspected repository state, not every API response

### State Owner & Consumers
- **Owner:** Which service/slice owns this state?
- **Consumers:** What services read this state?
- **Update Policy:** Who can write, delete, or bypass validation?

---

## Unknown/Missing Contract Stop

> If the contract changes or a field meaning becomes ambiguous, **STOP immediately**. Do not guess or assume backward compatibility.

**Contract violations requiring immediate escalation:**
- [ ] A field type changes (e.g., `string` to `null`, numeric to string)
- [ ] A required field becomes optional or vice versa
- [ ] Documented cardinality changes (1-to-1 becomes 1-to-many)
- [ ] A field's semantic meaning is unclear (e.g., does `null` mean "disabled" or "not set"?)
- [ ] Existing consumer breaks silently (no error, just wrong data)
- [ ] A new required field appears in upstream data
- [ ] Missing field documentation contradicts observed behavior

**How to escalate:**
1. Post on the story/issue: "Unknown/ambiguous contract: [field name] [describe]"
2. Link to evidence: commit hash, schema version, API response, or code snippet
3. Provide the specific conflicting versions you observed
4. Request explicit human decision before proceeding
5. Do NOT merge, ship, or proceed until approved

---

## Key Files, Inputs, Outputs, Database Tables, ADRs, Tests

[Use subsections below for implementation — these are **your checklist**, not examples.]

### Key Files
- [ ] [file path]

### Inputs
| Input | Type | Source | Validation |
|-------|------|--------|-----------|
| [field] | [type] | [source] | [rule] |

### Outputs
[Description]

### Database Tables Owned
- [ ] [table_name]: [fields]

### ADRs to Read
- [ ] [ADR-XXX](link/to/adr) — [short description]

### Tests (Your Definition of Done)
- [ ] [test case name]: [success criterion]

### Common Patterns
[Code examples specific to this slice]

### Dependencies
[Other slices or services this depends on]
