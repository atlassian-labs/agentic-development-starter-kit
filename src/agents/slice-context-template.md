# [SLICE NAME] — Context

> **Read this file before writing any code for this slice.** It defines the domain rules, boundaries, and invariants that all agents must follow.

---

## Purpose

[ONE SENTENCE — what this slice does and why it exists]

---

## Key Files

| File | Purpose |
|------|---------|
| `src/backend/routes/[slice].js` | API route handlers |
| `src/backend/services/[SliceService].js` | Business logic |
| `src/frontend/components/[Component]/[Component].js` | UI |
| `src/backend/routes/[slice].test.js` | Tests (your definition of done) |

---

## Domain Rules

> These are invariants — they must be true at all times. If you're unsure, stop and ask before proceeding.

1. **[RULE 1]** — [WHY THIS RULE EXISTS]
2. **[RULE 2]** — [WHY THIS RULE EXISTS]
3. **[RULE 3]** — [WHY THIS RULE EXISTS]

---

## Inputs

| Input | Type | Source | Validation |
|-------|------|--------|-----------|
| `[field]` | `string` | Request body | [VALIDATION RULE] |
| `[field]` | `number` | URL param | Must be positive integer |

---

## Outputs

| Output | Type | When |
|--------|------|------|
| `[field]` | `{ id, title, status }` | On success |
| Error | `{ error: string }` | On failure |

**API routes this slice exposes:**
- `GET /api/[slice]` — [what it returns]
- `POST /api/[slice]` — [what it creates]
- `PATCH /api/[slice]/:id` — [what it updates]

---

## Database Tables Owned

```sql
-- This slice owns these tables — no other slice should write to them
CREATE TABLE [table_name] (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- [fields]
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## ADRs to Read

- `docs/adr/ADR-001-[relevant]` — [brief description of why it's relevant]
- `docs/adr/ADR-002-[relevant]` — [brief description]

---

## Tests (Your Definition of Done)

The tests in `[slice].test.js` define what "done" means. Run them:

```bash
npx jest src/backend/routes/[slice].test.js --testEnvironment=node
```

**Key test cases:**
- `[TEST CASE 1]` — tests [what scenario]
- `[TEST CASE 2]` — tests [what scenario]
- `[TEST CASE 3]` — tests error handling for [scenario]

All tests must pass before you declare done.

---

## What NOT to Do

- ❌ Do NOT write to `[OTHER_TABLE]` — that's owned by `[OTHER_SLICE]`
- ❌ Do NOT call `GlobalServeManager.chat()` for [SPECIFIC OPERATION] — use `_chatDirectFresh()` instead
- ❌ Do NOT hardcode [SPECIFIC VALUE] — use `process.env.[VAR_NAME]`
- ❌ Do NOT create mock data in production paths — error state only
- ❌ Do NOT touch files outside `src/backend/routes/[slice].js`, `src/backend/services/[SliceService].js`, and `src/frontend/components/[Component]/`

---

## Common Patterns in This Slice

```javascript
// Standard route handler pattern for this slice
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const results = await db.all('SELECT * FROM [table] WHERE user_id = ?', [req.user.id]);
    res.json({ [slice]: results });
  } catch (err) {
    logger.error('[slice] fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch [slice]' });
  }
});
```

---

## Dependencies

**This slice calls:**
- `src/database/connection.js` — DB access
- `src/backend/services/[ExternalService].js` — [what for]

**This slice is called by:**
- `src/frontend/components/[Component]/` — via `GET /api/[slice]`
- `src/backend/services/[OtherService].js` — via [method]

**Do NOT create circular dependencies.**
