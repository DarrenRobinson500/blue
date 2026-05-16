# Database Setup

## Overview

`lifeplatform` uses a single PostgreSQL database (`lifeplatform`) with strict table prefix
conventions enforcing the data boundary between RiskCore and ActuarialCore.

For **local development**, SQLite is used automatically when no `DB_HOST` env var is set.
PostgreSQL is required for staging and production (Railway, AWS, etc.).

---

## Table prefix convention

Every model declares an explicit `db_table` in its Meta class. No default Django naming.

| App | Prefix | Example |
|---|---|---|
| core (shared) | `core_` | `core_user` |
| risk | `risk_` | `risk_obligation` |
| actuarial | `actuarial_` | `actuarial_data_schema` |
| shared output layer | `shared_` | `shared_report_table_definition` |

---

## PostgreSQL role setup (production)

Run once against the production database after initial `migrate`:

```sql
-- ActuarialCore role — write access to actuarial_* and shared_* tables
CREATE ROLE actuarial_app WITH LOGIN PASSWORD '<ACTUARIAL_DB_PASSWORD>';
GRANT CONNECT ON DATABASE lifeplatform TO actuarial_app;

-- RiskCore role — write access to risk_* tables; read-only on shared_* tables
CREATE ROLE risk_app WITH LOGIN PASSWORD '<RISK_DB_PASSWORD>';
GRANT CONNECT ON DATABASE lifeplatform TO risk_app;

-- Both roles need read access to core_* tables (User, Token)
-- Run after migrations:
GRANT SELECT ON core_user, authtoken_token TO risk_app, actuarial_app;

-- RiskCore write tables
GRANT SELECT, INSERT, UPDATE, DELETE ON
    risk_obligation_source,
    risk_obligation,
    risk_control,
    risk_obligation_control,
    risk_obligation_history
TO risk_app;

-- ActuarialCore write tables (all actuarial_* and shared_*)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO actuarial_app;

-- When shared_* tables are created (future reporting module):
-- GRANT SELECT ON shared_report_table_definition, shared_report_table_output TO risk_app;
-- GRANT SELECT, INSERT ON shared_report_table_definition, shared_report_table_output TO actuarial_app;
```

> **Phase 1 note:** A single superuser database connection is acceptable for development.
> Role separation must be enforced before production deployment.

---

## Cross-app model import rule

- `apps.risk` must never import a model from `apps.actuarial`, and vice versa.
- Both apps may freely import from `apps.core` (User, auth).
- All cross-app data access uses the `shared_` table layer:
  - `actuarial` app writes to `shared_` tables.
  - `risk` app declares those tables with `managed = False` and reads from them.

---

## Reserved shared output tables

These two tables are the complete cross-system data interface. They will be created by the
ActuarialCore reporting module (future phase). Do not create them in this build.

### `shared_report_table_definition`

Versioned definitions of named report tables authored by the Chief Actuary.

| Field | Type | Notes |
|---|---|---|
| id | BigAutoField PK | |
| name | CharField 255 | e.g. "Capital Position by Statutory Fund" |
| output_type | CharField choices | `capital` / `experience` / `valuation` / `assumptions` / `profit` / `custom` |
| description | TextField blank | What this table shows |
| version | PositiveIntegerField | First version = 1 |
| is_active | BooleanField | Only active definitions accepted for new runs |
| column_spec | JSONField | `[{"name": "fund", "display": "Statutory Fund", "type": "string"}, ...]` |
| query_spec | JSONField | Machine-readable derivation spec — interpreted by ActuarialCore engine only |
| created_by | FK core_user null | |
| created_at | DateTimeField | |
| notes | TextField blank | |

### `shared_report_table_output`

Output rows from each report table run, queryable by both chiefs. Append-only.

| Field | Type | Notes |
|---|---|---|
| id | BigAutoField PK | |
| definition | FK shared_report_table_definition | |
| run_date | DateField | Valuation or investigation date |
| produced_at | DateTimeField | When the run was executed |
| produced_by | FK core_user null | |
| inputs | JSONField | Full audit trail: data imports, assumption set version, projection run ID |
| data | JSONField | `[{"fund": "LIF", "pca": 42500, ...}, ...]` — keys match column_spec |
| version | PositiveIntegerField | Increments on corrected rerun for same (definition, run_date) |
| is_current | BooleanField | True for latest version per (definition, run_date) |
| notes | TextField blank | |

Both tables are **append-only**. Corrections publish a new row with `version` incremented
and `is_current` toggled on the new row and off the prior row. Full history is preserved.

---

## Canonical query patterns for RiskCore consumers

### Latest capital output

```sql
SELECT o.*
FROM shared_report_table_output o
JOIN shared_report_table_definition d ON o.definition_id = d.id
WHERE d.output_type = 'capital'
  AND o.is_current = True
ORDER BY o.run_date DESC
LIMIT 1;
```

### Latest output by any type

Replace `'capital'` with `'experience'`, `'valuation'`, `'assumptions'`, `'profit'`, or
`'custom'` to retrieve the latest run of any output type the Chief Actuary has published.
New types appear automatically without code changes on the RiskCore side.

### Resolve active dataset for a product/date (ActuarialCore internal)

```sql
SELECT *
FROM actuarial_data_import
WHERE schema_id = <schema_id>
  AND data_date = '<YYYY-MM-DD>'
  AND status = 'validated'
ORDER BY uploaded_at DESC
LIMIT 1;
```
