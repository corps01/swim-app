-- Deck attendance. Run after 07 (auth_user_owns_class).
-- One row per swimmer, class, and pool-local session day.
-- Unmarked means no row.

CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  session_date date NOT NULL,
  mark text NOT NULL CHECK (mark IN ('present', 'absent')),
  marked_by uuid NOT NULL REFERENCES public.profiles (id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_logs_one_per_day UNIQUE (class_id, child_id, session_date)
);

CREATE INDEX IF NOT EXISTS attendance_logs_class_day_idx
  ON public.attendance_logs (class_id, session_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_logs TO authenticated;

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_logs_instructor_select" ON public.attendance_logs;
CREATE POLICY "attendance_logs_instructor_select"
  ON public.attendance_logs
  FOR SELECT
  TO authenticated
  USING (public.auth_user_owns_class(class_id));

DROP POLICY IF EXISTS "attendance_logs_instructor_insert" ON public.attendance_logs;
CREATE POLICY "attendance_logs_instructor_insert"
  ON public.attendance_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    marked_by = auth.uid()
    AND public.auth_user_owns_class(class_id)
  );

DROP POLICY IF EXISTS "attendance_logs_instructor_update" ON public.attendance_logs;
CREATE POLICY "attendance_logs_instructor_update"
  ON public.attendance_logs
  FOR UPDATE
  TO authenticated
  USING (public.auth_user_owns_class(class_id))
  WITH CHECK (
    marked_by = auth.uid()
    AND public.auth_user_owns_class(class_id)
  );

DROP POLICY IF EXISTS "attendance_logs_instructor_delete" ON public.attendance_logs;
CREATE POLICY "attendance_logs_instructor_delete"
  ON public.attendance_logs
  FOR DELETE
  TO authenticated
  USING (public.auth_user_owns_class(class_id));
