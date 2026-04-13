CREATE OR REPLACE FUNCTION public.get_profile_achievement_stats(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_notes int;
  v_total_minutes int;
  v_best_streak int;
  v_best_month_days int;
  v_weekly_goals_met int;
  v_best_year_pct int;
BEGIN
  -- Total notes
  SELECT count(*)::int INTO v_total_notes
  FROM public.notes WHERE author_id = p_profile_id;

  -- Total practice minutes (sessions with notes)
  SELECT coalesce(sum(
    EXTRACT(EPOCH FROM (ps.ended_at - ps.started_at)) / 60
    - coalesce(ps.paused_duration_ms, 0) / 60000.0
  )::int, 0) INTO v_total_minutes
  FROM public.practice_sessions ps
  WHERE ps.user_id = p_profile_id
    AND ps.ended_at IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.notes n WHERE n.session_id = ps.id);

  -- Best streak from achievement counts
  SELECT coalesce(max(key::int), 0) INTO v_best_streak
  FROM jsonb_each_text(
    coalesce(
      (SELECT streak_achievement_counts FROM public.profiles WHERE id = p_profile_id),
      '{}'::jsonb
    )
  ) WHERE value::int > 0;

  -- Best month days practiced (unique days with practice activity)
  SELECT coalesce(max(day_count), 0) INTO v_best_month_days
  FROM (
    SELECT to_char(d.practice_date, 'YYYY-MM') as month_key, count(DISTINCT d.practice_date) as day_count
    FROM (
      -- Days from sessions with notes
      SELECT (ps.started_at AT TIME ZONE 'UTC')::date as practice_date
      FROM public.practice_sessions ps
      WHERE ps.user_id = p_profile_id
        AND ps.ended_at IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.notes n WHERE n.session_id = ps.id)
      UNION
      -- Days from standalone notes (no session)
      SELECT (n.created_at AT TIME ZONE 'UTC')::date as practice_date
      FROM public.notes n
      WHERE n.author_id = p_profile_id
        AND n.session_id IS NULL
    ) d
    GROUP BY to_char(d.practice_date, 'YYYY-MM')
  ) monthly;

  -- Weekly goals met count
  SELECT count(*)::int INTO v_weekly_goals_met
  FROM public.weekly_goals wg
  WHERE wg.user_id = p_profile_id
    AND wg.skipped = false
    AND wg.target_minutes > 0
    AND (
      SELECT coalesce(sum(
        EXTRACT(EPOCH FROM (ps2.ended_at - ps2.started_at)) / 60
        - coalesce(ps2.paused_duration_ms, 0) / 60000.0
      ), 0)
      FROM public.practice_sessions ps2
      WHERE ps2.user_id = p_profile_id
        AND ps2.ended_at IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.notes n2 WHERE n2.session_id = ps2.id)
        AND ps2.started_at >= wg.week_start::timestamp
        AND ps2.started_at < (wg.week_start::timestamp + interval '7 days')
    ) >= wg.target_minutes;

  -- Best completed year practice percentage
  SELECT coalesce(max(pct), 0) INTO v_best_year_pct
  FROM (
    SELECT 
      EXTRACT(YEAR FROM d.practice_date)::int as yr,
      (count(DISTINCT d.practice_date)::float / 
        CASE WHEN EXTRACT(YEAR FROM d.practice_date)::int % 4 = 0 
              AND (EXTRACT(YEAR FROM d.practice_date)::int % 100 != 0 
                   OR EXTRACT(YEAR FROM d.practice_date)::int % 400 = 0)
             THEN 366 ELSE 365 END * 100)::int as pct
    FROM (
      SELECT (ps.started_at AT TIME ZONE 'UTC')::date as practice_date
      FROM public.practice_sessions ps
      WHERE ps.user_id = p_profile_id
        AND ps.ended_at IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.notes n WHERE n.session_id = ps.id)
      UNION
      SELECT (n.created_at AT TIME ZONE 'UTC')::date as practice_date
      FROM public.notes n
      WHERE n.author_id = p_profile_id AND n.session_id IS NULL
    ) d
    WHERE EXTRACT(YEAR FROM d.practice_date) < EXTRACT(YEAR FROM now())
    GROUP BY EXTRACT(YEAR FROM d.practice_date)
  ) yearly;

  RETURN jsonb_build_object(
    'total_notes', v_total_notes,
    'total_minutes', v_total_minutes,
    'best_streak', v_best_streak,
    'best_month_days', v_best_month_days,
    'weekly_goals_met_count', v_weekly_goals_met,
    'best_completed_year_pct', v_best_year_pct
  );
END;
$$;