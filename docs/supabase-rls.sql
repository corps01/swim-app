-- Run once in Supabase Dashboard → SQL Editor (after tables exist).
--
-- Schema this app expects (see src/lib/api/enrollment.ts):
--   children — no parent_id column; ownership via parent_child_relationships
--   parent_child_relationships — parent_id, child_id
--   child_instructor_relationships — child_id, instructor_id, status
--
-- If your children table still has parent_id, align the DB with the app or change the app.

-- Table privileges (RLS still applies; without GRANT, PostgREST returns 42501)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.children TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.parent_child_relationships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_instructor_relationships TO authenticated;

-- Helpers (SECURITY DEFINER + row_security off) avoid RLS infinite recursion between
-- parent_child_relationships ↔ child_instructor_relationships ↔ profiles.

CREATE OR REPLACE FUNCTION public.auth_user_is_parent_of_child(p_child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_child_relationships pcr
    WHERE pcr.child_id = p_child_id
      AND pcr.parent_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_is_instructor_for_child(p_child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.child_instructor_relationships cir
    WHERE cir.child_id = p_child_id
      AND cir.instructor_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_is_active_instructor_for_child(p_child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.child_instructor_relationships cir
    WHERE cir.child_id = p_child_id
      AND cir.instructor_id = auth.uid()
      AND cir.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.instructor_can_read_parent_profile(p_parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_child_relationships pcr
    INNER JOIN public.child_instructor_relationships cir ON cir.child_id = pcr.child_id
    WHERE pcr.parent_id = p_parent_id
      AND cir.instructor_id = auth.uid()
      AND cir.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_is_parent()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text = 'parent'
  );
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_is_parent() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_is_parent_of_child(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_is_instructor_for_child(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_is_active_instructor_for_child(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.instructor_can_read_parent_profile(uuid) TO authenticated;

-- Parent creates swimmer + parent_child_relationships in one call.
-- Direct INSERT ... RETURNING id fails RLS: SELECT on children requires a link row that does not exist yet.
CREATE OR REPLACE FUNCTION public.create_child_for_parent(
  p_first_name text,
  p_last_name text,
  p_date_of_birth date,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_child_id uuid;
  v_parent_id uuid := auth.uid();
BEGIN
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.auth_user_is_parent() THEN
    RAISE EXCEPTION 'Only parents can create swimmers' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.children (first_name, last_name, date_of_birth, notes)
  VALUES (trim(p_first_name), trim(p_last_name), p_date_of_birth, NULLIF(trim(p_notes), ''))
  RETURNING id INTO v_child_id;

  INSERT INTO public.parent_child_relationships (parent_id, child_id, relationship)
  VALUES (v_parent_id, v_child_id, 'parent');

  RETURN v_child_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_child_for_parent(text, text, date, text) TO authenticated;

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile details" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_instructors" ON public.profiles;
CREATE POLICY "profiles_select_instructors"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (role = 'instructor');

DROP POLICY IF EXISTS "profiles_select_parents_of_roster" ON public.profiles;
CREATE POLICY "profiles_select_parents_of_roster"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.instructor_can_read_parent_profile(id));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_role text := COALESCE(NEW.raw_user_meta_data->>'role', 'parent');
  resolved_role varchar := CASE
    WHEN meta_role IN ('instructor', 'parent') THEN meta_role
    ELSE 'parent'
  END;
  resolved_name text := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, resolved_role, resolved_name)
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE
      WHEN public.profiles.full_name IS NULL OR TRIM(public.profiles.full_name) = ''
        THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    role = CASE
      WHEN EXCLUDED.role IN ('instructor', 'parent') THEN EXCLUDED.role
      ELSE public.profiles.role
    END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- children
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read linked children" ON public.children;
DROP POLICY IF EXISTS "children_select_linked_parent" ON public.children;
DROP POLICY IF EXISTS "children_select_linked" ON public.children;
CREATE POLICY "children_select_linked"
  ON public.children FOR SELECT
  TO authenticated
  USING (
    public.auth_user_is_parent_of_child(id)
    OR public.auth_user_is_instructor_for_child(id)
  );

DROP POLICY IF EXISTS "Parents update linked children" ON public.children;
DROP POLICY IF EXISTS "children_update_linked_parent" ON public.children;
CREATE POLICY "children_update_linked_parent"
  ON public.children FOR UPDATE
  TO authenticated
  USING (public.auth_user_is_parent_of_child(id))
  WITH CHECK (public.auth_user_is_parent_of_child(id));

DROP POLICY IF EXISTS "children_insert_authenticated" ON public.children;
DROP POLICY IF EXISTS "children_insert_parent_only" ON public.children;
CREATE POLICY "children_insert_parent_only"
  ON public.children FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_user_is_parent());

-- parent_child_relationships
ALTER TABLE public.parent_child_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents read own child links" ON public.parent_child_relationships;
DROP POLICY IF EXISTS "pcr_insert_own" ON public.parent_child_relationships;
CREATE POLICY "pcr_insert_own"
  ON public.parent_child_relationships FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid());

DROP POLICY IF EXISTS "pcr_select_own" ON public.parent_child_relationships;
CREATE POLICY "pcr_select_own"
  ON public.parent_child_relationships FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "pcr_select_instructor_roster" ON public.parent_child_relationships;
CREATE POLICY "pcr_select_instructor_roster"
  ON public.parent_child_relationships FOR SELECT
  TO authenticated
  USING (public.auth_user_is_active_instructor_for_child(child_id));

DROP POLICY IF EXISTS "pcr_delete_own" ON public.parent_child_relationships;
CREATE POLICY "pcr_delete_own"
  ON public.parent_child_relationships FOR DELETE
  TO authenticated
  USING (parent_id = auth.uid());

-- child_instructor_relationships
ALTER TABLE public.child_instructor_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents and instructors read linked assignments" ON public.child_instructor_relationships;
DROP POLICY IF EXISTS "cir_select_parent" ON public.child_instructor_relationships;
DROP POLICY IF EXISTS "cir_select_linked" ON public.child_instructor_relationships;
CREATE POLICY "cir_select_linked"
  ON public.child_instructor_relationships FOR SELECT
  TO authenticated
  USING (
    instructor_id = auth.uid()
    OR public.auth_user_is_parent_of_child(child_id)
  );

DROP POLICY IF EXISTS "cir_insert_parent" ON public.child_instructor_relationships;
CREATE POLICY "cir_insert_parent"
  ON public.child_instructor_relationships FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_user_is_parent_of_child(child_id));

DROP POLICY IF EXISTS "cir_update_instructor" ON public.child_instructor_relationships;
CREATE POLICY "cir_update_instructor"
  ON public.child_instructor_relationships FOR UPDATE
  TO authenticated
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

DROP POLICY IF EXISTS "cir_delete_parent" ON public.child_instructor_relationships;
CREATE POLICY "cir_delete_parent"
  ON public.child_instructor_relationships FOR DELETE
  TO authenticated
  USING (public.auth_user_is_parent_of_child(child_id));

DROP POLICY IF EXISTS "cir_delete_instructor" ON public.child_instructor_relationships;
CREATE POLICY "cir_delete_instructor"
  ON public.child_instructor_relationships FOR DELETE
  TO authenticated
  USING (instructor_id = auth.uid());
