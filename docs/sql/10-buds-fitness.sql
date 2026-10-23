-- BUDS fitness-for-attendance. Run after 07.
-- Daily check-ins are one row per swimmer, class, template, and pool-local day.
-- Instructors log a verbal deck clearance in buds_deck_overrides.deck_override_by.

ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS session_date date;

ALTER TABLE public.form_submissions
  DROP CONSTRAINT IF EXISTS form_submissions_one_per_assignment;

CREATE UNIQUE INDEX IF NOT EXISTS form_submissions_one_enrollment
  ON public.form_submissions (child_id, class_id, template_id)
  WHERE session_date IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS form_submissions_one_session_day
  ON public.form_submissions (child_id, class_id, template_id, session_date)
  WHERE session_date IS NOT NULL;

GRANT UPDATE ON public.form_submissions TO authenticated;

DROP POLICY IF EXISTS "form_submissions_parent_update" ON public.form_submissions;
CREATE POLICY "form_submissions_parent_update"
  ON public.form_submissions
  FOR UPDATE
  TO authenticated
  USING (
    session_date IS NOT NULL
    AND public.auth_user_is_parent_of_child(child_id)
  )
  WITH CHECK (
    signed_by = auth.uid()
    AND session_date IS NOT NULL
    AND public.auth_user_is_parent_of_child(child_id)
    AND public.auth_user_parent_enrolled_in_class(class_id)
  );

CREATE TABLE IF NOT EXISTS public.buds_deck_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  session_date date NOT NULL,
  deck_override_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  deck_override_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT buds_deck_overrides_one_per_day UNIQUE (child_id, class_id, session_date)
);

CREATE INDEX IF NOT EXISTS buds_deck_overrides_class_day_idx
  ON public.buds_deck_overrides (class_id, session_date);

ALTER TABLE public.buds_deck_overrides ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.buds_deck_overrides
  ADD COLUMN IF NOT EXISTS deck_override_reason text;

GRANT SELECT, INSERT ON public.buds_deck_overrides TO authenticated;

DROP POLICY IF EXISTS "buds_deck_overrides_instructor_select" ON public.buds_deck_overrides;
CREATE POLICY "buds_deck_overrides_instructor_select"
  ON public.buds_deck_overrides
  FOR SELECT
  TO authenticated
  USING (public.auth_user_owns_class(class_id));

DROP POLICY IF EXISTS "buds_deck_overrides_instructor_insert" ON public.buds_deck_overrides;
CREATE POLICY "buds_deck_overrides_instructor_insert"
  ON public.buds_deck_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (
    deck_override_by = auth.uid()
    AND public.auth_user_owns_class(class_id)
  );

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
  ('11111111-1111-4111-8111-111111111219', NULL, 'isr_buds',
    'Fever since the last lesson?',
    'yes_no', NULL, 19, true),
  ('11111111-1111-4111-8111-111111111220', NULL, 'isr_buds',
    'Vomiting since the last lesson?',
    'yes_no', NULL, 20, true),
  ('11111111-1111-4111-8111-111111111221', NULL, 'isr_buds',
    'Diarrhea since the last lesson?',
    'yes_no', NULL, 21, true),
  ('11111111-1111-4111-8111-111111111222', NULL, 'isr_buds',
    'Time of last meal (pool local time)',
    'text', NULL, 22, true),
  ('11111111-1111-4111-8111-111111111223', NULL, 'isr_buds',
    'Hours of sleep since the last lesson',
    'text', NULL, 23, true)
ON CONFLICT (id) DO UPDATE
SET
  instructor_id = NULL,
  category = EXCLUDED.category,
  question_text = EXCLUDED.question_text,
  input_type = EXCLUDED.input_type,
  options = EXCLUDED.options,
  bank_order = EXCLUDED.bank_order,
  required_by_default = EXCLUDED.required_by_default;
