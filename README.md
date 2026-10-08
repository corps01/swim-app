# SplashPass

Parent enrollment for swim classes: Supabase auth, child profiles, and instructor linking.

## Stack

- React + TypeScript + Vite + Tailwind CSS
- Supabase Auth + Postgres (`profiles`, `children`, `parent_child_relationships`, `child_instructor_relationships`)

## Local development

```bash
cp .env.example .env
# Add your Supabase URL and anon key (project URL only, not /rest/v1)
npm install
npm run dev
```

In **Supabase → SQL Editor**, run [docs/sql/01-core-rls.sql](docs/sql/01-core-rls.sql) then [docs/sql/02-classes.sql](docs/sql/02-classes.sql) (see [docs/sql/README.md](docs/sql/README.md)). Step-by-step: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). Without those policies and grants, sign-in can succeed in Auth but the app cannot load `profiles`, so you stay on the login screen.

If you already confirmed email before running that SQL, sign in again after running the script. For a user missing a profile row, insert one in SQL (replace the user id from **Authentication → Users**):

```sql
insert into public.profiles (id, role, full_name)
values ('<auth-user-uuid>', 'parent', 'Your Name')
on conflict (id) do nothing;
```

## Auth & data hooks

| File | Purpose |
|------|---------|
| `src/lib/env.ts` | Validates `SUPABASE_*` env vars |
| `src/lib/supabase.ts` | Supabase client singleton |
| `src/hooks/useAuth.ts` | Session + sign-in/up/out against Supabase Auth |
| `src/hooks/useParentSwimmers.ts` | Loads enrolled children for the signed-in parent |
| `src/hooks/useEnrollment.ts` | Submits enrollment with loading/error state |
| `src/lib/api/enrollment.ts` | Inserts child + relationship rows |
| `src/lib/api/profile.ts` | Reads/creates `profiles` rows for parents |

Parent sign-up creates a `profiles` row with `role = parent`. Instructor linking uses the instructor’s **profile UUID** as the invite ID (`?invite=<uuid>` supported).

Product requirements: [docs/SWIM_FORM_REQUIREMENTS.md](docs/SWIM_FORM_REQUIREMENTS.md)
