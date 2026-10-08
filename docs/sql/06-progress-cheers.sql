-- Parent cheers on progress logs. Run after 05. Idempotent.

CREATE TABLE IF NOT EXISTS public.progress_log_cheers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_log_id uuid NOT NULL REFERENCES public.progress_logs(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT progress_log_cheers_one_per_parent UNIQUE (progress_log_id, parent_id)
);

CREATE INDEX IF NOT EXISTS progress_log_cheers_log_idx
  ON public.progress_log_cheers (progress_log_id);

GRANT SELECT, INSERT, DELETE ON public.progress_log_cheers TO authenticated;

ALTER TABLE public.progress_log_cheers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_cheers_select_linked" ON public.progress_log_cheers;
CREATE POLICY "progress_cheers_select_linked"
  ON public.progress_log_cheers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.progress_logs pl
      WHERE pl.id = progress_log_id
        AND (
          public.auth_user_is_parent_of_child(pl.child_id)
          OR public.auth_user_is_instructor_for_child(pl.child_id)
        )
    )
  );

DROP POLICY IF EXISTS "progress_cheers_insert_parent" ON public.progress_log_cheers;
CREATE POLICY "progress_cheers_insert_parent"
  ON public.progress_log_cheers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    parent_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.progress_logs pl
      WHERE pl.id = progress_log_id
        AND public.auth_user_is_parent_of_child(pl.child_id)
    )
  );

DROP POLICY IF EXISTS "progress_cheers_delete_own" ON public.progress_log_cheers;
CREATE POLICY "progress_cheers_delete_own"
  ON public.progress_log_cheers
  FOR DELETE
  TO authenticated
  USING (parent_id = auth.uid());
