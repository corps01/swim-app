-- =============================================================================
-- SplashPass 04 — Transactional class + schedule RPCs
-- =============================================================================
-- Run FOURTH, after 03-schedules.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Format schedule_details from structured rule payload (single source of truth)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.format_schedule_details_summary(
  p_days int[],
  p_start time,
  p_end time
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_days IS NULL OR cardinality(p_days) IS NULL THEN NULL
    ELSE (
      (
        SELECT string_agg(
          CASE d
            WHEN 1 THEN 'Mon'
            WHEN 2 THEN 'Tue'
            WHEN 3 THEN 'Wed'
            WHEN 4 THEN 'Thu'
            WHEN 5 THEN 'Fri'
            WHEN 6 THEN 'Sat'
            WHEN 7 THEN 'Sun'
            ELSE ''
          END,
          ' & '
          ORDER BY d
        )
        FROM unnest(p_days) AS d
      )
      || ' · '
      || to_char(p_start, 'FMHH12:MI AM')
      || ' – '
      || to_char(p_end, 'FMHH12:MI AM')
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.apply_class_schedule_rules(
  p_class_id uuid,
  p_schedule jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_days int[];
  v_start time;
  v_end time;
  v_location_detail text;
  v_effective_from date;
  v_effective_until date;
  d int;
BEGIN
  IF p_schedule IS NULL THEN
    RAISE EXCEPTION 'Schedule payload is required';
  END IF;

  SELECT coalesce(
    array_agg(value::int ORDER BY value::int),
    ARRAY[]::int[]
  )
  INTO v_days
  FROM jsonb_array_elements_text(p_schedule -> 'days_of_week') AS value;

  v_start := (p_schedule ->> 'start_time')::time;
  v_end := (p_schedule ->> 'end_time')::time;
  v_location_detail := nullif(btrim(p_schedule ->> 'location_detail'), '');
  v_effective_from := coalesce((p_schedule ->> 'effective_from')::date, CURRENT_DATE);
  v_effective_until := (p_schedule ->> 'effective_until')::date;

  IF array_length(v_days, 1) IS NULL OR array_length(v_days, 1) < 1 THEN
    RAISE EXCEPTION 'At least one day of week is required';
  END IF;

  IF v_start IS NULL OR v_end IS NULL OR v_end <= v_start THEN
    RAISE EXCEPTION 'Invalid session start/end times';
  END IF;

  DELETE FROM public.class_schedule_rules WHERE class_id = p_class_id;

  FOREACH d IN ARRAY v_days
  LOOP
    IF d < 1 OR d > 7 THEN
      RAISE EXCEPTION 'Invalid day_of_week: %', d;
    END IF;

    INSERT INTO public.class_schedule_rules (
      class_id,
      day_of_week,
      start_time,
      end_time,
      location_detail,
      effective_from,
      effective_until
    )
    VALUES (
      p_class_id,
      d,
      v_start,
      v_end,
      v_location_detail,
      v_effective_from,
      v_effective_until
    );
  END LOOP;

  UPDATE public.classes
  SET schedule_details = public.format_schedule_details_summary(v_days, v_start, v_end)
  WHERE id = p_class_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.format_schedule_details_summary(int[], time, time) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_class_schedule_rules(uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Create class + rules (single transaction)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_class_with_schedule(
  p_name text,
  p_location text DEFAULT NULL,
  p_timezone text DEFAULT 'UTC',
  p_max_capacity integer DEFAULT NULL,
  p_schedule jsonb DEFAULT NULL
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
  v_timezone text := btrim(coalesce(p_timezone, ''));
  attempt int := 0;
BEGIN
  IF v_instructor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Class name is required';
  END IF;

  IF v_timezone = '' OR NOT public.is_valid_iana_timezone(v_timezone) THEN
    RAISE EXCEPTION 'Invalid pool timezone';
  END IF;

  IF p_schedule IS NULL THEN
    RAISE EXCEPTION 'Schedule is required';
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
        max_capacity,
        timezone
      )
      VALUES (
        v_instructor_id,
        btrim(p_name),
        nullif(btrim(coalesce(p_location, '')), ''),
        NULL,
        v_code,
        p_max_capacity,
        v_timezone
      )
      RETURNING * INTO v_row;

      PERFORM public.apply_class_schedule_rules(v_row.id, p_schedule);

      SELECT * INTO v_row FROM public.classes WHERE id = v_row.id;
      RETURN row_to_json(v_row);
    EXCEPTION
      WHEN unique_violation THEN
        CONTINUE;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_class_with_schedule(text, text, text, integer, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Update class metadata + replace schedule rules (single transaction)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_class_with_schedule(
  p_class_id uuid,
  p_name text,
  p_location text DEFAULT NULL,
  p_timezone text DEFAULT NULL,
  p_max_capacity integer DEFAULT NULL,
  p_schedule jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_instructor_id uuid := auth.uid();
  v_row public.classes%ROWTYPE;
  v_timezone text;
BEGIN
  IF v_instructor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_class_id IS NULL THEN
    RAISE EXCEPTION 'Class id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = p_class_id AND c.instructor_id = v_instructor_id
  ) THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Class name is required';
  END IF;

  v_timezone := btrim(coalesce(p_timezone, ''));
  IF v_timezone <> '' AND NOT public.is_valid_iana_timezone(v_timezone) THEN
    RAISE EXCEPTION 'Invalid pool timezone';
  END IF;

  IF p_schedule IS NULL THEN
    RAISE EXCEPTION 'Schedule is required';
  END IF;

  UPDATE public.classes
  SET
    name = btrim(p_name),
    location = nullif(btrim(coalesce(p_location, '')), ''),
    timezone = CASE
      WHEN v_timezone <> '' THEN v_timezone
      ELSE timezone
    END,
    max_capacity = coalesce(p_max_capacity, max_capacity)
  WHERE id = p_class_id
  RETURNING * INTO v_row;

  PERFORM public.apply_class_schedule_rules(p_class_id, p_schedule);

  SELECT * INTO v_row FROM public.classes WHERE id = p_class_id;
  RETURN row_to_json(v_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_class_with_schedule(uuid, text, text, text, integer, jsonb) TO authenticated;
