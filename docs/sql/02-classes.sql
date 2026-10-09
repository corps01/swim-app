-- =============================================================================
-- SplashPass 02 — Classes, class codes, and class-based enrollment
-- =============================================================================
-- Run SECOND, after 01-core-rls.sql.
-- Safe to re-run (IF NOT EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. classes table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  name text NOT NULL,
  location text,
  schedule_details text,
  class_code text NOT NULL,
  max_capacity integer NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT classes_class_code_format CHECK (char_length(class_code) = 6),
  CONSTRAINT classes_class_code_upper CHECK (class_code = upper(class_code))
);

CREATE UNIQUE INDEX IF NOT EXISTS classes_class_code_unique ON public.classes (class_code);
CREATE INDEX IF NOT EXISTS classes_instructor_id_idx ON public.classes (instructor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classes_instructor_all" ON public.classes;
CREATE POLICY "classes_instructor_all"
  ON public.classes
  FOR ALL
  TO authenticated
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. class_id on enrollments (before any policy references cir.class_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.child_instructor_relationships
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes (id) ON DELETE RESTRICT;

ALTER TABLE public.child_instructor_relationships
  DROP CONSTRAINT IF EXISTS child_instructor_relationships_child_id_instructor_id_key;

DROP INDEX IF EXISTS public.cir_child_instructor_unique;
DROP INDEX IF EXISTS public.child_instructor_relationships_child_id_instructor_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS cir_child_class_unique
  ON public.child_instructor_relationships (child_id, class_id)
  WHERE class_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Parents: read only classes their swimmers are enrolled in
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "classes_parent_enrolled_select" ON public.classes;
CREATE POLICY "classes_parent_enrolled_select"
  ON public.classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.child_instructor_relationships cir
      WHERE cir.class_id = classes.id
        AND public.auth_user_is_parent_of_child(cir.child_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 4. RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enrollment_class_matches_instructor(
  p_class_id uuid,
  p_instructor_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = p_class_id
      AND c.instructor_id = p_instructor_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.enrollment_class_matches_instructor(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_class_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_instructor_class(
  p_name text,
  p_location text DEFAULT NULL,
  p_schedule_details text DEFAULT NULL,
  p_max_capacity integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_instructor_id uuid := auth.uid();
  v_code text;
  v_row public.classes%ROWTYPE;
  attempt int := 0;
BEGIN
  IF v_instructor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Class name is required';
  END IF;

  LOOP
    attempt := attempt + 1;
    IF attempt > 12 THEN
      RAISE EXCEPTION 'Could not generate a unique class code';
    END IF;

    v_code := public.generate_class_code();

    BEGIN
      INSERT INTO public.classes (
        instructor_id,
        name,
        location,
        schedule_details,
        class_code,
        max_capacity
      )
      VALUES (
        v_instructor_id,
        trim(p_name),
        nullif(trim(coalesce(p_location, '')), ''),
        nullif(trim(coalesce(p_schedule_details, '')), ''),
        v_code,
        p_max_capacity
      )
      RETURNING * INTO v_row;

      RETURN row_to_json(v_row);
    EXCEPTION
      WHEN unique_violation THEN
        CONTINUE;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_class_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_instructor_class(text, text, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_class_by_code(p_code text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  normalized text := upper(trim(p_code));
  result json;
BEGIN
  IF normalized IS NULL OR char_length(normalized) <> 6 THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'id', c.id,
    'instructor_id', c.instructor_id,
    'name', c.name,
    'class_code', c.class_code,
    'instructor_name', p.full_name,
    'location', c.location,
    'schedule_details', c.schedule_details
  )
  INTO result
  FROM public.classes c
  INNER JOIN public.profiles p ON p.id = c.instructor_id
  WHERE c.class_code = normalized
  LIMIT 1;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_class_by_code(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Parent enroll: requires class_id + matching instructor
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "cir_insert_parent" ON public.child_instructor_relationships;
CREATE POLICY "cir_insert_parent"
  ON public.child_instructor_relationships FOR INSERT
  TO authenticated
  WITH CHECK (
    public.auth_user_is_parent_of_child(child_id)
    AND class_id IS NOT NULL
    AND instructor_id IS NOT NULL
    AND public.enrollment_class_matches_instructor(class_id, instructor_id)
  );

-- Parents can reactivate their own swimmer in a class (pending/inactive → active).
DROP POLICY IF EXISTS "cir_update_parent" ON public.child_instructor_relationships;
CREATE POLICY "cir_update_parent"
  ON public.child_instructor_relationships FOR UPDATE
  TO authenticated
  USING (public.auth_user_is_parent_of_child(child_id))
  WITH CHECK (
    public.auth_user_is_parent_of_child(child_id)
    AND class_id IS NOT NULL
    AND instructor_id IS NOT NULL
    AND public.enrollment_class_matches_instructor(class_id, instructor_id)
  );
