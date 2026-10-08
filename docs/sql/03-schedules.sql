-- =============================================================================
-- SplashPass 03 — Structured schedules, pool timezone, instructor agenda RPC
-- =============================================================================
-- Run THIRD, after 02-classes.sql.
-- Safe to re-run (IF NOT EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Pool timezone anchor on classes (required for correct "today" boundaries)
-- ---------------------------------------------------------------------------
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS timezone text;

UPDATE public.classes
SET timezone = 'America/Denver'
WHERE timezone IS NULL OR btrim(timezone) = '';

ALTER TABLE public.classes
  ALTER COLUMN timezone SET NOT NULL;

ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_timezone_not_empty;

ALTER TABLE public.classes
  ADD CONSTRAINT classes_timezone_not_empty CHECK (char_length(btrim(timezone)) > 0);

CREATE OR REPLACE FUNCTION public.is_valid_iana_timezone(p_tz text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pg_timezone_names
    WHERE name = p_tz
  );
$$;

ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_timezone_valid;

ALTER TABLE public.classes
  ADD CONSTRAINT classes_timezone_valid CHECK (public.is_valid_iana_timezone(timezone));

-- ---------------------------------------------------------------------------
-- 2. Recurring schedule rules (hybrid base layer)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_schedule_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  location_detail text,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_schedule_rules_dow CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT class_schedule_rules_time_order CHECK (end_time > start_time),
  CONSTRAINT class_schedule_rules_effective_range CHECK (
    effective_until IS NULL OR effective_until >= effective_from
  )
);

COMMENT ON COLUMN public.class_schedule_rules.day_of_week IS
  'ISO day of week: 1 = Monday … 7 = Sunday (matches EXTRACT(ISODOW FROM date)).';

CREATE INDEX IF NOT EXISTS class_schedule_rules_class_id_idx
  ON public.class_schedule_rules (class_id);

CREATE INDEX IF NOT EXISTS class_schedule_rules_dow_idx
  ON public.class_schedule_rules (day_of_week);

-- ---------------------------------------------------------------------------
-- 3. Schedule exceptions (cancellations / one-off overrides)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  is_cancelled boolean NOT NULL DEFAULT true,
  override_start_time time,
  override_end_time time,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_schedule_exceptions_unique_date UNIQUE (class_id, exception_date),
  CONSTRAINT class_schedule_exceptions_override_times CHECK (
    (override_start_time IS NULL AND override_end_time IS NULL)
    OR (
      override_start_time IS NOT NULL
      AND override_end_time IS NOT NULL
      AND override_end_time > override_start_time
    )
  )
);

CREATE INDEX IF NOT EXISTS class_schedule_exceptions_class_date_idx
  ON public.class_schedule_exceptions (class_id, exception_date);

-- ---------------------------------------------------------------------------
-- 4. RLS on schedule tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.class_schedule_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedule_exceptions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_schedule_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_schedule_exceptions TO authenticated;

DROP POLICY IF EXISTS "class_schedule_rules_instructor_all" ON public.class_schedule_rules;
CREATE POLICY "class_schedule_rules_instructor_all"
  ON public.class_schedule_rules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = class_schedule_rules.class_id
        AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = class_schedule_rules.class_id
        AND c.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "class_schedule_exceptions_instructor_all" ON public.class_schedule_exceptions;
CREATE POLICY "class_schedule_exceptions_instructor_all"
  ON public.class_schedule_exceptions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = class_schedule_exceptions.class_id
        AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = class_schedule_exceptions.class_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Parents enrolled in class may read rules (display on parent home later).
DROP POLICY IF EXISTS "class_schedule_rules_parent_enrolled_select" ON public.class_schedule_rules;
CREATE POLICY "class_schedule_rules_parent_enrolled_select"
  ON public.class_schedule_rules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.child_instructor_relationships cir
      WHERE cir.class_id = class_schedule_rules.class_id
        AND public.auth_user_is_parent_of_child(cir.child_id)
    )
  );

DROP POLICY IF EXISTS "class_schedule_exceptions_parent_enrolled_select" ON public.class_schedule_exceptions;
CREATE POLICY "class_schedule_exceptions_parent_enrolled_select"
  ON public.class_schedule_exceptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.child_instructor_relationships cir
      WHERE cir.class_id = class_schedule_exceptions.class_id
        AND public.auth_user_is_parent_of_child(cir.child_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Class-scoped instructor helper (stricter than child-level link)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_is_instructor_for_child_in_class(
  p_child_id uuid,
  p_class_id uuid
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
    FROM public.child_instructor_relationships cir
    WHERE cir.child_id = p_child_id
      AND cir.class_id = p_class_id
      AND cir.instructor_id = auth.uid()
      AND cir.status IN ('active', 'pending')
  );
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_is_instructor_for_child_in_class(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Retire class create without schedule rules
-- Class create/update is create_class_with_schedule / update_class_with_schedule (script 04).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_instructor_class(text, text, text, integer);
DROP FUNCTION IF EXISTS public.create_instructor_class(text, text, text, integer, text);

-- ---------------------------------------------------------------------------
-- 7. Instructor agenda feed (no medical note text — flags only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_instructor_agenda(p_date date)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_instructor_id uuid := auth.uid();
  v_isodow int;
  result json;
BEGIN
  IF v_instructor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_date IS NULL THEN
    RAISE EXCEPTION 'Agenda date is required';
  END IF;

  v_isodow := EXTRACT(ISODOW FROM p_date)::int;

  SELECT json_build_object(
    'date', p_date,
    'sessions', COALESCE(
      (
        SELECT json_agg(session_row ORDER BY session_row ->> 'sort_key')
        FROM (
          SELECT json_build_object(
            'schedule_rule_id', r.id,
            'class_id', c.id,
            'class_name', c.name,
            'class_code', c.class_code,
            'timezone', c.timezone,
            'location', c.location,
            'location_detail', r.location_detail,
            'start_time', to_char(
              COALESCE(x.override_start_time, r.start_time),
              'HH24:MI:SS'
            ),
            'end_time', to_char(
              COALESCE(x.override_end_time, r.end_time),
              'HH24:MI:SS'
            ),
            'sort_key', to_char(COALESCE(x.override_start_time, r.start_time), 'HH24:MI:SS'),
            'season_start', r.effective_from,
            'season_end', r.effective_until,
            'recurring_days_label', (
              SELECT string_agg(
                CASE rr.day_of_week
                  WHEN 1 THEN 'Mon'
                  WHEN 2 THEN 'Tue'
                  WHEN 3 THEN 'Wed'
                  WHEN 4 THEN 'Thu'
                  WHEN 5 THEN 'Fri'
                  WHEN 6 THEN 'Sat'
                  WHEN 7 THEN 'Sun'
                END,
                ' · '
                ORDER BY rr.day_of_week
              )
              FROM public.class_schedule_rules rr
              WHERE rr.class_id = c.id
                AND rr.effective_from <= p_date
                AND (rr.effective_until IS NULL OR rr.effective_until >= p_date)
            ),
            'duration_minutes', (
              EXTRACT(
                EPOCH FROM (
                  COALESCE(x.override_end_time, r.end_time)
                  - COALESCE(x.override_start_time, r.start_time)
                )
              ) / 60
            )::int,
            'swimmers', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'child_id', ch.id,
                    'first_name', ch.first_name,
                    'last_name', ch.last_name,
                    'has_medical_flag', (
                      ch.notes IS NOT NULL AND btrim(ch.notes) <> ''
                    ),
                    'has_form_alert', (cir.status <> 'active'),
                    'enrollment_status', cir.status
                  )
                  ORDER BY ch.last_name, ch.first_name
                )
                FROM public.child_instructor_relationships cir
                INNER JOIN public.children ch ON ch.id = cir.child_id
                WHERE cir.class_id = c.id
                  AND cir.instructor_id = v_instructor_id
                  AND cir.status IN ('active', 'pending')
                  AND public.auth_user_is_instructor_for_child_in_class(ch.id, c.id)
              ),
              '[]'::json
            )
          ) AS session_row
          FROM public.classes c
          INNER JOIN public.class_schedule_rules r ON r.class_id = c.id
          LEFT JOIN public.class_schedule_exceptions x
            ON x.class_id = c.id
            AND x.exception_date = p_date
          WHERE c.instructor_id = v_instructor_id
            AND r.day_of_week = v_isodow
            AND r.effective_from <= p_date
            AND (r.effective_until IS NULL OR r.effective_until >= p_date)
            AND NOT (
              x.id IS NOT NULL
              AND x.is_cancelled = true
              AND x.override_start_time IS NULL
            )
        ) AS agenda_sessions
      ),
      '[]'::json
    )
  )
  INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_instructor_agenda(date) TO authenticated;
