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
| **2** | [`02-classes.sql`](./02-classes.sql) | `classes` table, `class_id` on enrollments, class RLS, `get_class_by_code`, parent **class** enroll policy. Script 03 drops the no-schedule `create_instructor_class` RPC. |
| **3** | [`03-schedules.sql`](./03-schedules.sql) | `classes.timezone`, `class_schedule_rules` / `class_schedule_exceptions`, `get_instructor_agenda`, class-scoped instructor helper |
| **4** | [`04-class-schedule-rpcs.sql`](./04-class-schedule-rpcs.sql) | `create_class_with_schedule`, `update_class_with_schedule`, transactional `schedule_details` formatting |
| **5** | [`05-progress-logs.sql`](./05-progress-logs.sql) | `progress_logs` table, RLS, `progress-photos` storage bucket |
| **6** | [`06-progress-cheers.sql`](./06-progress-cheers.sql) | Parent cheers on a progress log (one per parent) |

Scripts are **idempotent** (`CREATE OR REPLACE`, `DROP POLICY IF EXISTS`, `IF NOT EXISTS`). Safe to re-run after a partial failure.

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
SELECT proname FROM pg_proc WHERE proname = 'get_class_by_code';

-- Schedules (after step 3)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'classes' AND column_name = 'timezone';
SELECT proname FROM pg_proc WHERE proname = 'get_instructor_agenda';

-- Class create (after step 4)
SELECT proname FROM pg_proc
WHERE proname IN ('create_class_with_schedule', 'update_class_with_schedule');

-- Example: Wednesday 4:00–4:45 PM for a class (ISODOW 3 = Wednesday)
-- INSERT INTO public.class_schedule_rules (class_id, day_of_week, start_time, end_time, location_detail)
-- VALUES ('<class-uuid>', 3, '16:00', '16:45', 'Lane 3');
```

## File map (this folder)

| File | Keep? |
|------|--------|
| `01-core-rls.sql` | Base app security & enrollment helpers |
| `02-classes.sql` | Class codes, instructor classes, class-based enrollment |
| `03-schedules.sql` | Structured schedules, pool timezone, instructor agenda RPC |
| `05-progress-logs.sql` | Instructor progress notes/photos for parents |
| `06-progress-cheers.sql` | Parent cheer on a progress update |

Legacy files at `docs/supabase-*.sql` were removed; use this folder only.
