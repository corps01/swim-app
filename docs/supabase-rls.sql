-- Run in Supabase Dashboard → SQL Editor after creating tables.
-- Fixes: "permission denied for table profiles" and login succeeding but app staying on sign-in.

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Optional: auto-create profile on sign-up (works even if the app upsert fails)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name
  WHERE public.profiles.full_name IS NULL OR public.profiles.full_name = '';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- children (parent enrollment)
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "children_insert_authenticated" ON public.children;
CREATE POLICY "children_insert_authenticated"
  ON public.children FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "children_select_linked_parent" ON public.children;
CREATE POLICY "children_select_linked_parent"
  ON public.children FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_relationships pcr
      WHERE pcr.child_id = children.id AND pcr.parent_id = auth.uid()
    )
  );

-- parent_child_relationships
ALTER TABLE public.parent_child_relationships ENABLE ROW LEVEL SECURITY;

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

-- child_instructor_relationships
ALTER TABLE public.child_instructor_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cir_insert_parent" ON public.child_instructor_relationships;
CREATE POLICY "cir_insert_parent"
  ON public.child_instructor_relationships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parent_child_relationships pcr
      WHERE pcr.child_id = child_instructor_relationships.child_id
        AND pcr.parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cir_select_parent" ON public.child_instructor_relationships;
CREATE POLICY "cir_select_parent"
  ON public.child_instructor_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_relationships pcr
      WHERE pcr.child_id = child_instructor_relationships.child_id
        AND pcr.parent_id = auth.uid()
    )
  );

-- Instructors: parents can look up instructor profiles by id (enrollment invite UUID)
DROP POLICY IF EXISTS "profiles_select_instructors" ON public.profiles;
CREATE POLICY "profiles_select_instructors"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (role = 'instructor');
