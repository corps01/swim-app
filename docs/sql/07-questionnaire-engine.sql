-- Questionnaire & form engine. Run after 01–06. Idempotent.
-- System questions (instructor_id IS NULL) are shared defaults.
-- Instructors manage their own questions, templates, and class attachments.
-- Parents can read a form assigned to a class their swimmer is in, and can
-- insert and read submissions for their own children.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid REFERENCES public.profiles (id) ON DELETE CASCADE,
  category text NOT NULL,
  question_text text NOT NULL,
  input_type text NOT NULL,
  options jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_bank_input_type_check CHECK (
    input_type IN ('text', 'textarea', 'yes_no', 'select')
  ),
  CONSTRAINT question_bank_text_not_blank CHECK (btrim(question_text) <> '')
);

CREATE INDEX IF NOT EXISTS question_bank_instructor_idx
  ON public.question_bank (instructor_id);

ALTER TABLE public.question_bank DROP CONSTRAINT IF EXISTS question_bank_input_type_check;
ALTER TABLE public.question_bank
  ADD CONSTRAINT question_bank_input_type_check
  CHECK (input_type IN ('text', 'textarea', 'yes_no', 'select'));

-- bank_order keeps a built-in bank in its printed order; required_by_default
-- seeds the Required toggle when an instructor adds the question.
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS bank_order integer;
ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS required_by_default boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT form_templates_title_not_blank CHECK (btrim(title) <> '')
);

CREATE INDEX IF NOT EXISTS form_templates_instructor_idx
  ON public.form_templates (instructor_id);

CREATE TABLE IF NOT EXISTS public.form_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.form_templates (id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank (id) ON DELETE RESTRICT,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  CONSTRAINT form_template_questions_unique UNIQUE (template_id, question_id)
);

CREATE INDEX IF NOT EXISTS form_template_questions_template_idx
  ON public.form_template_questions (template_id, sort_order);

CREATE TABLE IF NOT EXISTS public.class_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.form_templates (id) ON DELETE CASCADE,
  is_mandatory_for_enrollment boolean NOT NULL DEFAULT false,
  CONSTRAINT class_forms_unique UNIQUE (class_id, template_id)
);

CREATE INDEX IF NOT EXISTS class_forms_class_idx
  ON public.class_forms (class_id);

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.form_templates (id) ON DELETE RESTRICT,
  signed_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  legal_text_snapshot text,
  signature_data_url text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT form_submissions_one_per_assignment UNIQUE (child_id, class_id, template_id)
);

CREATE INDEX IF NOT EXISTS form_submissions_child_idx
  ON public.form_submissions (child_id, signed_at DESC);

CREATE INDEX IF NOT EXISTS form_submissions_class_idx
  ON public.form_submissions (class_id, template_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_bank TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_template_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_forms TO authenticated;
GRANT SELECT, INSERT ON public.form_submissions TO authenticated;

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Helpers (security definer so policies do not recurse)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_owns_form_template(p_template_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.form_templates ft
    WHERE ft.id = p_template_id
      AND ft.instructor_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_owns_class(p_class_id uuid)
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
      AND c.instructor_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_parent_enrolled_in_class(p_class_id uuid)
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
    WHERE cir.class_id = p_class_id
      AND public.auth_user_is_parent_of_child(cir.child_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_can_use_question(p_question_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.question_bank q
    WHERE q.id = p_question_id
      AND (q.instructor_id IS NULL OR q.instructor_id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_parent_can_read_template(p_template_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_forms cf
    WHERE cf.template_id = p_template_id
      AND public.auth_user_parent_enrolled_in_class(cf.class_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_parent_can_read_question(p_question_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.form_template_questions ftq
    INNER JOIN public.class_forms cf ON cf.template_id = ftq.template_id
    WHERE ftq.question_id = p_question_id
      AND public.auth_user_parent_enrolled_in_class(cf.class_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_class_has_template(
  p_class_id uuid,
  p_template_id uuid
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
    FROM public.class_forms cf
    WHERE cf.class_id = p_class_id
      AND cf.template_id = p_template_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_owns_form_template(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_owns_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_parent_enrolled_in_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_can_use_question(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_parent_can_read_template(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_parent_can_read_question(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_class_has_template(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. question_bank
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "question_bank_select" ON public.question_bank;
CREATE POLICY "question_bank_select"
  ON public.question_bank
  FOR SELECT
  TO authenticated
  USING (
    instructor_id IS NULL
    OR instructor_id = auth.uid()
    OR public.auth_user_parent_can_read_question(id)
  );

DROP POLICY IF EXISTS "question_bank_insert_own" ON public.question_bank;
CREATE POLICY "question_bank_insert_own"
  ON public.question_bank
  FOR INSERT
  TO authenticated
  WITH CHECK (instructor_id = auth.uid());

DROP POLICY IF EXISTS "question_bank_update_own" ON public.question_bank;
CREATE POLICY "question_bank_update_own"
  ON public.question_bank
  FOR UPDATE
  TO authenticated
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

DROP POLICY IF EXISTS "question_bank_delete_own" ON public.question_bank;
CREATE POLICY "question_bank_delete_own"
  ON public.question_bank
  FOR DELETE
  TO authenticated
  USING (instructor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. form_templates
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "form_templates_instructor_all" ON public.form_templates;
CREATE POLICY "form_templates_instructor_all"
  ON public.form_templates
  FOR ALL
  TO authenticated
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

DROP POLICY IF EXISTS "form_templates_parent_select" ON public.form_templates;
CREATE POLICY "form_templates_parent_select"
  ON public.form_templates
  FOR SELECT
  TO authenticated
  USING (public.auth_user_parent_can_read_template(id));

-- ---------------------------------------------------------------------------
-- 5. form_template_questions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "form_template_questions_instructor_all" ON public.form_template_questions;
CREATE POLICY "form_template_questions_instructor_all"
  ON public.form_template_questions
  FOR ALL
  TO authenticated
  USING (public.auth_user_owns_form_template(template_id))
  WITH CHECK (
    public.auth_user_owns_form_template(template_id)
    AND public.auth_user_can_use_question(question_id)
  );

DROP POLICY IF EXISTS "form_template_questions_parent_select" ON public.form_template_questions;
CREATE POLICY "form_template_questions_parent_select"
  ON public.form_template_questions
  FOR SELECT
  TO authenticated
  USING (public.auth_user_parent_can_read_template(template_id));

-- ---------------------------------------------------------------------------
-- 6. class_forms
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "class_forms_instructor_all" ON public.class_forms;
CREATE POLICY "class_forms_instructor_all"
  ON public.class_forms
  FOR ALL
  TO authenticated
  USING (
    public.auth_user_owns_class(class_id)
    AND public.auth_user_owns_form_template(template_id)
  )
  WITH CHECK (
    public.auth_user_owns_class(class_id)
    AND public.auth_user_owns_form_template(template_id)
  );

DROP POLICY IF EXISTS "class_forms_parent_select" ON public.class_forms;
CREATE POLICY "class_forms_parent_select"
  ON public.class_forms
  FOR SELECT
  TO authenticated
  USING (public.auth_user_parent_enrolled_in_class(class_id));

-- ---------------------------------------------------------------------------
-- 7. form_submissions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "form_submissions_parent_select" ON public.form_submissions;
CREATE POLICY "form_submissions_parent_select"
  ON public.form_submissions
  FOR SELECT
  TO authenticated
  USING (public.auth_user_is_parent_of_child(child_id));

DROP POLICY IF EXISTS "form_submissions_instructor_select" ON public.form_submissions;
CREATE POLICY "form_submissions_instructor_select"
  ON public.form_submissions
  FOR SELECT
  TO authenticated
  USING (public.auth_user_owns_class(class_id));

DROP POLICY IF EXISTS "form_submissions_parent_insert" ON public.form_submissions;
CREATE POLICY "form_submissions_parent_insert"
  ON public.form_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    signed_by = auth.uid()
    AND public.auth_user_is_parent_of_child(child_id)
    AND public.auth_user_parent_enrolled_in_class(class_id)
    AND public.auth_user_class_has_template(class_id, template_id)
  );

-- ---------------------------------------------------------------------------
-- 8. System default questions
-- ---------------------------------------------------------------------------
INSERT INTO public.question_bank (
  id,
  instructor_id,
  category,
  question_text,
  input_type,
  options
)
VALUES
  (
    '11111111-1111-4111-8111-111111111101',
    NULL,
    'medical',
    'Medical/Allergies',
    'textarea',
    NULL
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    NULL,
    'emergency',
    'Emergency Phone',
    'text',
    NULL
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    NULL,
    'release',
    'Photo Release Authorization',
    'yes_no',
    NULL
  ),
  (
    '11111111-1111-4111-8111-111111111104',
    NULL,
    'legal',
    'Liability Waiver Consent',
    'yes_no',
    NULL
  )
ON CONFLICT (id) DO UPDATE
SET
  instructor_id = NULL,
  category = EXCLUDED.category,
  question_text = EXCLUDED.question_text,
  input_type = EXCLUDED.input_type,
  options = EXCLUDED.options;

-- ISR Daily BUDS Interview for RET Protocols. Explanation boxes default to
-- optional so parents only fill them when something changed.
INSERT INTO public.question_bank (
  id,
  instructor_id,
  category,
  question_text,
  input_type,
  options,
  bank_order,
  required_by_default
)
VALUES
  ('11111111-1111-4111-8111-111111111201', NULL, 'isr_buds',
    'Were all bowel movements since the last lesson normal in consistency and schedule?',
    'yes_no', NULL, 1, true),
  ('11111111-1111-4111-8111-111111111202', NULL, 'isr_buds',
    'Was urine output more, normal, or less than usual in the hour after the last lesson?',
    'select', '["More", "Normal", "Less"]'::jsonb, 2, true),
  ('11111111-1111-4111-8111-111111111203', NULL, 'isr_buds',
    'Has urination frequency/amount been normal since the last lesson?',
    'yes_no', NULL, 3, true),
  ('11111111-1111-4111-8111-111111111204', NULL, 'isr_buds',
    'Explanation for any changes to bowel & urine',
    'textarea', NULL, 4, false),
  ('11111111-1111-4111-8111-111111111205', NULL, 'isr_buds',
    'What has your child had to eat or drink in the last two hours? Please note when.',
    'textarea', NULL, 5, true),
  ('11111111-1111-4111-8111-111111111206', NULL, 'isr_buds',
    'Please list any new foods given since the last lesson, as well as any reaction to the new food.',
    'textarea', NULL, 6, false),
  ('11111111-1111-4111-8111-111111111207', NULL, 'isr_buds',
    'Was your child''s sleep/nap schedule typical since the last lesson?',
    'yes_no', NULL, 7, true),
  ('11111111-1111-4111-8111-111111111208', NULL, 'isr_buds',
    'Did your child fall asleep within 10 minutes of the last lesson?',
    'yes_no', NULL, 8, true),
  ('11111111-1111-4111-8111-111111111209', NULL, 'isr_buds',
    'Explanation for any changes to sleep',
    'textarea', NULL, 9, false),
  ('11111111-1111-4111-8111-111111111210', NULL, 'isr_buds',
    'Have there been any changes to your child''s activity/energy level or normal routine since the last lesson?',
    'yes_no', NULL, 10, true),
  ('11111111-1111-4111-8111-111111111211', NULL, 'isr_buds',
    'Has your child been swimming or in the water (other than bathing) since the last lesson?',
    'yes_no', NULL, 11, true),
  ('11111111-1111-4111-8111-111111111212', NULL, 'isr_buds',
    'Has your child had any illnesses, seizures, fever >100.5, vomiting or skin rashes since the last lesson?',
    'yes_no', NULL, 12, true),
  ('11111111-1111-4111-8111-111111111213', NULL, 'isr_buds',
    'Has your child had any injuries or required any medical attention (including MD appts)?',
    'yes_no', NULL, 13, true),
  ('11111111-1111-4111-8111-111111111214', NULL, 'isr_buds',
    'Has your child taken any medication since the last lesson?',
    'yes_no', NULL, 14, true),
  ('11111111-1111-4111-8111-111111111215', NULL, 'isr_buds',
    'Explanation for YES answers and list ALL medications',
    'textarea', NULL, 15, false),
  ('11111111-1111-4111-8111-111111111216', NULL, 'isr_buds',
    'Child''s temperature within one hour of lesson and/or 24 hour activity notes (if required)',
    'textarea', NULL, 16, false),
  ('11111111-1111-4111-8111-111111111217', NULL, 'isr_buds',
    'Do you have any questions or concerns about your child participating in lessons today, or about your child''s progression so far?',
    'yes_no', NULL, 17, true),
  ('11111111-1111-4111-8111-111111111218', NULL, 'isr_buds',
    'Explanation for any missed lessons/lesson notes',
    'textarea', NULL, 18, false)
ON CONFLICT (id) DO UPDATE
SET
  instructor_id = NULL,
  category = EXCLUDED.category,
  question_text = EXCLUDED.question_text,
  input_type = EXCLUDED.input_type,
  options = EXCLUDED.options,
  bank_order = EXCLUDED.bank_order,
  required_by_default = EXCLUDED.required_by_default;

-- ---------------------------------------------------------------------------
-- 9. Save a template, its questions, and class links in one transaction
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_form_template(
  p_template_id uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_questions jsonb DEFAULT '[]'::jsonb,
  p_class_links jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_instructor_id uuid := auth.uid();
  v_id uuid;
  v_title text := btrim(coalesce(p_title, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_uuid_pattern constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  IF v_instructor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_title = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  IF p_questions IS NULL OR jsonb_typeof(p_questions) <> 'array' THEN
    RAISE EXCEPTION 'Questions must be a list';
  END IF;

  IF p_class_links IS NULL OR jsonb_typeof(p_class_links) <> 'array' THEN
    RAISE EXCEPTION 'Classes must be a list';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_questions) AS elem
    WHERE coalesce(elem->>'question_id', '') !~ v_uuid_pattern
  ) THEN
    RAISE EXCEPTION 'Invalid question';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_class_links) AS elem
    WHERE coalesce(elem->>'class_id', '') !~ v_uuid_pattern
  ) THEN
    RAISE EXCEPTION 'Invalid class';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_questions) AS elem
    GROUP BY elem->>'question_id'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Each question can be added once';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_class_links) AS elem
    GROUP BY elem->>'class_id'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Each class can be linked once';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_questions) AS elem
    LEFT JOIN public.question_bank q
      ON q.id = (elem->>'question_id')::uuid
    WHERE q.id IS NULL
       OR (q.instructor_id IS NOT NULL AND q.instructor_id <> v_instructor_id)
  ) THEN
    RAISE EXCEPTION 'Question is not available';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_class_links) AS elem
    LEFT JOIN public.classes c
      ON c.id = (elem->>'class_id')::uuid
    WHERE c.id IS NULL
       OR c.instructor_id <> v_instructor_id
  ) THEN
    RAISE EXCEPTION 'Class is not available';
  END IF;

  IF p_template_id IS NULL THEN
    INSERT INTO public.form_templates (instructor_id, title, description, is_active)
    VALUES (v_instructor_id, v_title, v_description, coalesce(p_is_active, true))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.form_templates
    SET
      title = v_title,
      description = v_description,
      is_active = coalesce(p_is_active, true)
    WHERE id = p_template_id
      AND instructor_id = v_instructor_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Questionnaire not found';
    END IF;
  END IF;

  DELETE FROM public.form_template_questions
  WHERE template_id = v_id;

  INSERT INTO public.form_template_questions (template_id, question_id, sort_order, is_required)
  SELECT
    v_id,
    (elem->>'question_id')::uuid,
    (ordinality - 1)::integer,
    coalesce((elem->>'is_required')::boolean, true)
  FROM jsonb_array_elements(p_questions) WITH ORDINALITY AS listed(elem, ordinality);

  DELETE FROM public.class_forms
  WHERE template_id = v_id;

  INSERT INTO public.class_forms (class_id, template_id, is_mandatory_for_enrollment)
  SELECT
    (elem->>'class_id')::uuid,
    v_id,
    coalesce((elem->>'is_mandatory_for_enrollment')::boolean, false)
  FROM jsonb_array_elements(p_class_links) AS listed(elem);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_form_template(uuid, text, text, boolean, jsonb, jsonb) TO authenticated;
