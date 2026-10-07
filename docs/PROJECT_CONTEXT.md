# Swim Form — Project Context

Focused form-management for independent swim instructors and parents: health/safety forms before each session, immutable submission history, and strict instructor–child data isolation.

## Today’s foundation scope

- Vite + React + TypeScript + Tailwind
- Supabase client and env configuration
- Email/password auth UI (SSO and DB tables follow in Supabase migrations)
- TypeScript models: `Profile`, `Child`, `ParentChildRelationship`, `ChildInstructorRelationship`

## Full product requirements

See [docs/SWIM_FORM_REQUIREMENTS.md](./docs/SWIM_FORM_REQUIREMENTS.md).

## Roles

| Role | Account | Notes |
|------|---------|--------|
| Instructor | `Profile.role = 'instructor'` | Forms, rules, invitations, rosters |
| Parent | `Profile.role = 'parent'` | Children, form completion, history |
| Child | No login | Profile owned by parent; linked to instructors per relationship |

## Data isolation

Each `ChildInstructorRelationship` is scoped to one instructor. Instructors never see another instructor’s forms or history for the same child.
