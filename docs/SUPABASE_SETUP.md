# Supabase setup checklist (parent + instructor)

Use project **swim form app** (or your own) with the same table names: `profiles`, `children`, `parent_child_relationships`, `child_instructor_relationships`.

## 1. Project settings

1. **Authentication → Providers → Email**: enable Email provider.
2. If **Confirm email** is ON (recommended for production), sign-up returns no session until the user clicks the link. The app handles this; the DB trigger still creates `profiles` on user insert.
3. Copy **Project URL** and **anon** key into `.env` (see `.env.example`). Use the project URL root only, not `/rest/v1`.

## 2. Run SQL (required once)

1. Open **SQL Editor**.
2. Paste and run the full script: [supabase-rls.sql](./supabase-rls.sql).

This script:

- `GRANT`s `authenticated` access to insert/select enrollment tables (without these, Postgres error `42501` / “permission denied for table children”).
- Enables RLS policies for parents and instructors.
- Creates `handle_new_user` on `auth.users` so `profiles.role` comes from sign-up metadata (`parent` or `instructor`).

## 3. Create accounts in the app

### Parent

1. Run `npm run dev`, open the app.
2. Choose **Parent** → **Create account** → name, email, password → submit.
3. If email confirmation is enabled: confirm via email, then **Sign in** as Parent.
4. You should land on the parent home (not stuck on login).

### Instructor

1. Choose **Instructor** → **Create account** → submit.
2. Confirm email if required, then **Sign in** as Instructor.
3. You should see the instructor placeholder screen (“Parent enrollment only” / sign out). That means `profiles.role = instructor` loaded correctly.

Share the instructor’s **profile UUID** with parents (Authentication → Users → user → same id as `profiles.id`, or Table Editor → `profiles` → copy `id` where `role = instructor`).

## 4. Verify in Supabase Dashboard

| Check | Where | Expected |
|-------|--------|----------|
| Auth user exists | Authentication → Users | Email confirmed (if required) |
| Profile row | Table Editor → `profiles` | Same `id` as auth user; `role` = `parent` or `instructor`; `full_name` set |
| Trigger | Database → Triggers on `auth.users` | `on_auth_user_created` → `handle_new_user` |
| Parent enrollment | App: enroll a swimmer with instructor UUID | Rows in `children`, `parent_child_relationships`, `child_instructor_relationships` |
| Instructor lookup | Signed-in parent enters instructor UUID | `profiles_select_instructors` allows read of instructor row |

### Quick SQL checks

Replace `<user-uuid>` with the auth user id:

```sql
select id, role, full_name from public.profiles where id = '<user-uuid>';
```

List instructors visible to any signed-in user (RLS as parent):

```sql
-- run in SQL editor as postgres (bypasses RLS) to audit data:
select id, full_name from public.profiles where role = 'instructor';
```

## 5. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Sign-in works in Auth but app shows profile error | Re-run [supabase-rls.sql](./supabase-rls.sql); ensure `profiles` row exists for that UUID |
| Sign-up succeeds then error immediately | Email confirmation is on; confirm email and sign in (app now shows a “check your email” message instead of failing) |
| Parent cannot enroll / permission denied | Re-run SQL script for `GRANT`s on `children`, `parent_child_relationships`, `child_instructor_relationships` |
| RLS blocks `children` insert (“new row violates…”) | Sign in as **parent** (`profiles.role` = `parent`, not dev skip auth). If you are Omar but still 403 on `children?select=id`, run SQL for **`create_child_for_parent`** — plain INSERT+RETURNING fails SELECT RLS until `parent_child_relationships` exists. |
| Instructor not found on enroll | Instructor must have `role = instructor`; parent must paste full profile UUID |
| Wrong role after sign-up | Metadata must include `role: instructor` or `parent` (app sends this); re-run trigger function from SQL script |

## 6. Local build

```bash
npm install
npm run build
```
