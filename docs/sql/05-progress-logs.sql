-- Progress logs (photo diary) + storage bucket for instructor → parent updates.
-- Run after 01–04. Idempotent.

-- ---------------------------------------------------------------------------
-- 1. progress_logs table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progress_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  photo_url text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT progress_logs_note_or_photo_required CHECK (
    photo_url IS NOT NULL OR (note IS NOT NULL AND btrim(note) <> '')
  )
);

CREATE INDEX IF NOT EXISTS progress_logs_child_created_idx
  ON public.progress_logs (child_id, created_at DESC);

CREATE INDEX IF NOT EXISTS progress_logs_instructor_created_idx
  ON public.progress_logs (instructor_id, created_at DESC);

GRANT SELECT, INSERT ON public.progress_logs TO authenticated;

ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_logs_insert_instructor" ON public.progress_logs;
CREATE POLICY "progress_logs_insert_instructor"
  ON public.progress_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    instructor_id = auth.uid()
    AND public.auth_user_is_active_instructor_for_child(child_id)
    AND (
      class_id IS NULL
      OR public.auth_user_is_instructor_for_child_in_class(child_id, class_id)
    )
  );

DROP POLICY IF EXISTS "progress_logs_select_linked" ON public.progress_logs;
CREATE POLICY "progress_logs_select_linked"
  ON public.progress_logs
  FOR SELECT
  TO authenticated
  USING (
    public.auth_user_is_parent_of_child(child_id)
    OR public.auth_user_is_instructor_for_child(child_id)
  );

-- ---------------------------------------------------------------------------
-- 2. Storage bucket progress-photos (public read for simple parent img tags)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'progress-photos',
  'progress-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Object path convention: {child_id}/{uuid}.jpg

DROP POLICY IF EXISTS "progress_photos_insert_instructor" ON storage.objects;
CREATE POLICY "progress_photos_insert_instructor"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND public.auth_user_is_active_instructor_for_child(
      ((storage.foldername(name))[1])::uuid
    )
  );

DROP POLICY IF EXISTS "progress_photos_select_linked" ON storage.objects;
CREATE POLICY "progress_photos_select_linked"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND (
      public.auth_user_is_parent_of_child(((storage.foldername(name))[1])::uuid)
      OR public.auth_user_is_instructor_for_child(((storage.foldername(name))[1])::uuid)
    )
  );

DROP POLICY IF EXISTS "progress_photos_delete_instructor" ON storage.objects;
CREATE POLICY "progress_photos_delete_instructor"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND public.auth_user_is_active_instructor_for_child(
      ((storage.foldername(name))[1])::uuid
    )
  );
