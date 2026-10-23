-- =============================================================================
-- SplashPass 08 — Notification preferences
-- =============================================================================
-- Run AFTER 01-core-rls.sql in the Supabase SQL Editor.
-- Creates one settings row per profile. New profiles get defaults automatically:
-- remind 2 hours before class, push on, per-class frequency.
-- Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  notify_before_hours integer NOT NULL DEFAULT 2,
  push_notifications_enabled boolean NOT NULL DEFAULT true,
  daily_agenda_summary_enabled boolean NOT NULL DEFAULT false,
  reminder_frequency text NOT NULL DEFAULT 'per_class',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_hours_check
    CHECK (notify_before_hours IN (1, 2, 4, 24)),
  CONSTRAINT notification_preferences_frequency_check
    CHECK (reminder_frequency IN ('per_class', 'daily_digest'))
);

-- If an earlier draft of this table exists, make sure the columns/defaults match.
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS daily_agenda_summary_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.notification_preferences
  ALTER COLUMN notify_before_hours SET DEFAULT 2;
ALTER TABLE public.notification_preferences
  ALTER COLUMN push_notifications_enabled SET DEFAULT true;
ALTER TABLE public.notification_preferences
  ALTER COLUMN reminder_frequency SET DEFAULT 'per_class';

GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_preferences_select_own" ON public.notification_preferences;
CREATE POLICY "notification_preferences_select_own"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_preferences_insert_own" ON public.notification_preferences;
CREATE POLICY "notification_preferences_insert_own"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_preferences_update_own" ON public.notification_preferences;
CREATE POLICY "notification_preferences_update_own"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_notification_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_preferences_touch_updated_at ON public.notification_preferences;
CREATE TRIGGER notification_preferences_touch_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_notification_preferences_updated_at();

-- Default row for every new profile (handle_new_user in 01 creates the profile).
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_create_notification_preferences ON public.profiles;
CREATE TRIGGER profiles_create_notification_preferences
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_notification_preferences();

-- Backfill existing accounts.
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Verification:
-- SELECT user_id, notify_before_hours, push_notifications_enabled,
--        daily_agenda_summary_enabled, reminder_frequency
-- FROM public.notification_preferences;
