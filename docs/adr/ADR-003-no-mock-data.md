# ADR-003 — No Mock Data in Production Code Paths

**Status:** ACCEPTED — ENFORCED  
**Date:** [DATE]

---

## Context

During early development, it's tempting to use mock/hardcoded data as "temporary" scaffolding. This causes serious problems in production:
- Users see fake data and lose trust in the product
- Hardcoded IDs/emails create security and privacy risks  
- Mock data is almost never removed — it becomes permanent

**Lesson:** 8 instances of mock/hardcoded data were found and removed weeks after they were introduced. They had been shipped to production without detection.

---

## Decision

**Zero mock data in any production code path.** This is enforced, not optional.

### What this means

```javascript
// ❌ WRONG — mock data in production
const MOCK_GOALS = [{ id: 1, title: 'Grow Revenue' }];
const goals = apiAvailable ? await fetchGoals() : MOCK_GOALS;

// ❌ WRONG — hardcoded credentials/IDs
const SLACK_CHANNEL = 'C0ARA4TQ64R';
const USER_EMAIL = 'someone@company.com';

// ✅ RIGHT — clear error state, no fake data
try {
  const goals = await fetchGoals();
  return goals;
} catch (err) {
  logger.error('Goals unavailable:', err.message);
  return { error: 'Goals unavailable — check your Atlas connection', data: [] };
}

// ✅ RIGHT — configuration from environment
const SLACK_CHANNEL = process.env.SLACK_CHANNEL_ID;
if (!SLACK_CHANNEL) {
  logger.warn('SLACK_CHANNEL_ID not set — chat integration disabled');
  return;
}
```

### What counts as mock data
- Arrays/objects named `MOCK_*`, `fake_*`, `dummy_*`, `sample_*`
- Hardcoded email addresses (even @yourcompany.com)
- Hardcoded user IDs, account IDs, or org IDs
- Hardcoded API keys or tokens (even expired ones)
- Hardcoded chat channel IDs, issue tracker project keys, or similar IDs
- Feature flag names that don't exist in your flag management system

---

## Enforcement

1. **ESLint rule** — Add to `.eslintrc`: flag patterns matching `MOCK_`, `fake_`, `dummy_`
2. **CI grep check** — `grep -r "MOCK_\|@yourcompany\.com\|hardcoded" src/ --include="*.js"` fails build if found
3. **Code review** — Reviewers check for mock data patterns before approving

---

## Exception

Mock data is allowed **only in test files** (`*.test.js`, `__fixtures__/`, `__mocks__/`):

```javascript
// ✅ OK in test files
jest.mock('../database/connection', () => ({
  getDb: () => ({ get: jest.fn(() => ({ id: 1, title: 'Test Story' })) })
}));
```
