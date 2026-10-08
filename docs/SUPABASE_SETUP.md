# Supabase setup checklist (parent + instructor)

Use project **swim form app** (or your own) with the same table names: `profiles`, `children`, `parent_child_relationships`, `child_instructor_relationships`, and (after step 2) `classes`.

## 1. Project settings

1. **Authentication → Providers → Email**: enable Email provider.
2. If **Confirm email** is ON (recommended for production), sign-up returns no session until the user clicks the link. The app handles this; the DB trigger still creates `profiles` on user insert.
3. Copy **Project URL** and **anon** key into `.env` (see `.env.example`). Use the project URL root only, not `/rest/v1`.

## 2. Run SQL (required once)

Open **SQL Editor** and run these in order (full details: [sql/README.md](./sql/README.md)):

| Step | File |
|------|------|
| 1 | [sql/01-core-rls.sql](./sql/01-core-rls.sql) — GRANTs, helpers, `create_child_for_parent`, RLS on core tables |
| 2 | [sql/02-classes.sql](./sql/02-classes.sql) — `classes`, `class_id`, class RPCs, class enrollment policy |

Both scripts are safe to re-run if something failed halfway.

## 3. Create accounts in the app

### Parent

1. Run `npm run dev`, open the app.
2. Choose **Parent** → **Create account** → name, email, password → submit.
3. If email confirmation is enabled: confirm via email, then **Sign in** as Parent.
4. You should land on the parent home (not stuck on login).

### Instructor

1. Choose **Instructor** → **Create account** → submit.
2. Confirm email if required, then **Sign in** as Instructor.
3. You should see the instructor dashboard.

Instructors create a **class** in the app and share the **6-character class code** (or invite link with `?invite=CODE`).

## 4. Verify in Supabase Dashboard

| Check | Where | Expected |
|-------|--------|----------|
| Auth user exists | Authentication → Users | Email confirmed (if required) |
| Profile row | Table Editor → `profiles` | Same `id` as auth user; `role` = `parent` or `instructor`; `full_name` set |
| Trigger | Database → Triggers on `auth.users` | `on_auth_user_created` → `handle_new_user` |
| Classes | Table Editor → `classes` | Row after instructor creates a class in the app |
| Parent enrollment | App: enroll with class code | Rows in `child_instructor_relationships` with `class_id` set |

### Quick SQL checks

```sql
select id, role, full_name from public.profiles where id = '<user-uuid>';

select to_regclass('public.classes');
select proname from pg_proc where proname in ('get_class_by_code', 'create_class_with_schedule');
```

## 5. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Sign-in works in Auth but app shows profile error | Re-run [01-core-rls.sql](./sql/01-core-rls.sql); ensure `profiles` row exists |
| Sign-up succeeds then error immediately | Confirm email and sign in |
| Parent cannot enroll / permission denied | Re-run both SQL scripts for GRANTs and `cir_insert_parent` |
| RLS blocks `children` insert | Sign in as **parent**; use `create_child_for_parent` RPC (see 01-core-rls.sql) |
| Class code not found | Run [02-classes.sql](./sql/02-classes.sql); instructor must create a class in the app |
| `column cir.class_id does not exist` | Run [02-classes.sql](./sql/02-classes.sql) in full (adds `class_id` before policies) |

## 6. Local build

```bash
npm install
npm run build
```
