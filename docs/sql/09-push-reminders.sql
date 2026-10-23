-- =============================================================================
-- SplashPass 09 — Push subscription + BUDS reminder log
-- =============================================================================
-- Run AFTER 08-notification-preferences.sql in the Supabase SQL Editor.
-- Stores the latest OneSignal subscription id per profile, and a log the
-- send-form-reminders Edge Function writes with the service role.
-- Safe to re-run.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onesignal_player_id text;

COMMENT ON COLUMN public.profiles.onesignal_player_id IS
  'Latest OneSignal subscription id for this account. One device; a new login on another phone replaces it.';

CREATE TABLE IF NOT EXISTS public.form_reminders_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  session_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  onesignal_player_id text,
  onesignal_notification_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT form_reminders_log_status_check
    CHECK (status IN ('pending', 'sent', 'failed')),
  CONSTRAINT form_reminders_log_once_per_session
    UNIQUE (user_id, child_id, class_id, session_date)
);

CREATE INDEX IF NOT EXISTS form_reminders_log_session_idx
  ON public.form_reminders_log (class_id, session_date, status);

GRANT SELECT ON public.form_reminders_log TO authenticated;

ALTER TABLE public.form_reminders_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "form_reminders_log_select_own" ON public.form_reminders_log;
CREATE POLICY "form_reminders_log_select_own"
  ON public.form_reminders_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Writes are service-role only (the Edge Function). No insert/update policy
-- for authenticated users.

CREATE OR REPLACE FUNCTION public.touch_form_reminders_log_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS form_reminders_log_touch_updated_at ON public.form_reminders_log;
CREATE TRIGGER form_reminders_log_touch_updated_at
  BEFORE UPDATE ON public.form_reminders_log
  FOR EACH ROW EXECUTE FUNCTION public.touch_form_reminders_log_updated_at();

-- ---------------------------------------------------------------------------
-- Cron (every 15 minutes) — run after the Edge Function is deployed.
-- Dashboard path: Edge Functions → send-form-reminders → Schedules → */15 * * * *
--
-- Or, with pg_cron + pg_net and the service role key stored in Vault
-- as `service_role_key`, uncomment and replace YOUR_PROJECT_REF:
--
-- SELECT cron.schedule(
--   'send-form-reminders',
--   '*/15 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-form-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (
--         SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'
--       )
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
-- ---------------------------------------------------------------------------

-- Verification:
-- SELECT id, onesignal_player_id FROM public.profiles WHERE onesignal_player_id IS NOT NULL;
-- SELECT user_id, child_id, class_id, session_date, status, error
-- FROM public.form_reminders_log ORDER BY created_at DESC;
