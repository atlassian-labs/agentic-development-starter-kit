# ADR-002 — Database Choice

**Status:** TEMPLATE — fill in your decision  
**Date:** [DATE]

---

## Context

This project needs persistent storage for [DESCRIBE YOUR DATA]. Options considered:

- **SQLite** — Zero infrastructure, file-based, works offline, not suitable for multi-user/cloud
- **PostgreSQL** — Production-grade, multi-user, requires infrastructure
- **MongoDB** — Document-oriented, schema-flexible, requires infrastructure

---

## Decision

We chose **[DATABASE]** because [REASON].

---

## Constraints (Regardless of DB Choice)

These rules apply no matter which database you choose:

### Parameterized Queries — Always
```javascript
// ❌ NEVER — SQL injection risk
db.run(`SELECT * FROM stories WHERE id = ${id}`);

// ✅ ALWAYS
db.run('SELECT * FROM stories WHERE id = ?', [id]);
```

### Single Connection Module
All database access goes through one module (`src/database/connection.js`). Never import the driver directly.

```javascript
// ❌ NEVER
const Database = require('better-sqlite3');
const db = new Database('./mydb.sqlite');

// ✅ ALWAYS
const { getDb } = require('../database/connection');
const db = getDb();
```

### Migrations — Numbered, Never Modified
- All schema changes go in `src/database/migrations/NNN-description.sql`
- Once merged, a migration is never modified — create a new one
- Run migrations on startup via `src/database/setup.js`

---

## Consequences

[FILL IN YOUR SPECIFIC CONSEQUENCES]
