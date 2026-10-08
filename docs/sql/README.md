# SplashPass — Supabase SQL

Run these scripts in the **Supabase Dashboard → SQL Editor** (one file per run, top to bottom).

## Prerequisites

Core tables must already exist in `public` (usually created when you first set up the project):

| Table | Purpose |
|-------|---------|
| `profiles` | Users (`id` = `auth.users.id`, `role`, `full_name`) |
| `children` | Swimmer records (no `parent_id`; use `parent_child_relationships`) |
| `parent_child_relationships` | `parent_id`, `child_id` |
| `child_instructor_relationships` | `child_id`, `instructor_id`, `status` |

If those tables are missing, create them in the Table Editor or from your original schema export before running script **01**.

## Run order

| Step | File | What it does |
|------|------|----------------|
| **1** | [`01-core-rls.sql`](./01-core-rls.sql) | GRANTs, auth helpers, `create_child_for_parent`, profile trigger, RLS on profiles / children / parent links / instructor links (read & update; **not** parent class enroll yet) |
| **2** | [`02-classes.sql`](./02-classes.sql) | `classes` table, `class_id` on enrollments, class RLS, RPCs (`get_class_by_code`, `create_instructor_class`, …), parent **class** enroll policy |

Both scripts are **idempotent** (`CREATE OR REPLACE`, `DROP POLICY IF EXISTS`, `IF NOT EXISTS`). Safe to re-run after a partial failure.

**Do not** run script 01’s old copy that included class RPCs before the `classes` table exists — use only the files in this folder.

## After SQL

See [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) for env vars, test accounts, and troubleshooting.

### Quick verification

```sql
-- Core
SELECT proname FROM pg_proc WHERE proname = 'create_child_for_parent';

-- Classes (after step 2)
SELECT to_regclass('public.classes');
SELECT column_name FROM information_schema.columns
WHERE table_name = 'child_instructor_relationships' AND column_name = 'class_id';
SELECT proname FROM pg_proc
WHERE proname IN ('get_class_by_code', 'create_instructor_class');
```

## File map (this folder)

| File | Keep? |
|------|--------|
| `01-core-rls.sql` | Base app security & enrollment helpers |
| `02-classes.sql` | Class codes, instructor classes, class-based enrollment |

Legacy files at `docs/supabase-*.sql` were removed; use this folder only.
