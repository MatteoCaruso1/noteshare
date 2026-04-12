
-- Replace get_monthly_ranking to dynamically compute synthetic benchmarks
-- so rankings shift daily even if the user doesn't practice
CREATE OR REPLACE FUNCTION public.get_monthly_ranking(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_month text;
  v_user_minutes integer;
  v_all_minutes integer[];
  v_total_users integer;
  v_rank integer;
  v_percentile numeric;
  v_next_tier_pct integer;
  v_next_tier_minutes integer;
  v_day_fraction numeric;
  v_days_in_month integer;
BEGIN
  v_current_month := to_char(now(), 'YYYY-MM');
  
  -- Day fraction: how far through the month we are
  v_days_in_month := extract(day from (date_trunc('month', now()) + interval '1 month' - interval '1 day'))::integer;
  v_day_fraction := extract(day from now())::numeric / v_days_in_month;
  
  -- Calculate user's total minutes this month
  SELECT coalesce(sum(
    EXTRACT(EPOCH FROM (ps.ended_at - ps.started_at)) / 60
    - coalesce(ps.paused_duration_ms, 0) / 60000.0
  )::integer, 0)
  INTO v_user_minutes
  FROM public.practice_sessions ps
  WHERE ps.user_id = p_profile_id
    AND ps.ended_at IS NOT NULL
    AND to_char(ps.started_at, 'YYYY-MM') = v_current_month
    AND EXISTS (SELECT 1 FROM public.notes n WHERE n.session_id = ps.id);
  
  -- Gather all minutes: real users + dynamically scaled synthetic benchmarks + current user
  SELECT array_agg(mins ORDER BY mins DESC)
  INTO v_all_minutes
  FROM (
    -- Real users (excluding current user)
    SELECT coalesce(sum(
      EXTRACT(EPOCH FROM (ps.ended_at - ps.started_at)) / 60
      - coalesce(ps.paused_duration_ms, 0) / 60000.0
    )::integer, 0) as mins
    FROM public.practice_sessions ps
    WHERE ps.ended_at IS NOT NULL
      AND ps.user_id != p_profile_id
      AND to_char(ps.started_at, 'YYYY-MM') = v_current_month
      AND EXISTS (SELECT 1 FROM public.notes n WHERE n.session_id = ps.id)
    GROUP BY ps.user_id
    
    UNION ALL
    
    -- Dynamic synthetic benchmarks: 101 fake users with full-month targets
    -- from 120min (2h) to 1680min (28h), scaled by day fraction
    SELECT round(
      (120 + (i * (1680 - 120)::numeric / 100)) * v_day_fraction
    )::integer as mins
    FROM generate_series(0, 100) as i
    
    UNION ALL
    
    -- Include current user
    SELECT v_user_minutes as mins
  ) sub
  WHERE mins IS NOT NULL;
  
  IF v_all_minutes IS NULL OR array_length(v_all_minutes, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'user_minutes', v_user_minutes,
      'percentile', 50,
      'rank', 1,
      'total_users', 1,
      'next_tier_pct', null,
      'minutes_to_next_tier', null
    );
  END IF;
  
  v_total_users := array_length(v_all_minutes, 1);
  
  SELECT count(*)::integer INTO v_rank
  FROM unnest(v_all_minutes) as m
  WHERE m > v_user_minutes;
  
  v_rank := v_rank + 1;
  
  v_percentile := round(((v_total_users - v_rank)::numeric / v_total_users) * 100);
  
  v_next_tier_pct := CASE
    WHEN (100 - v_percentile) <= 1 THEN null
    WHEN (100 - v_percentile) <= 3 THEN 1
    WHEN (100 - v_percentile) <= 5 THEN 3
    WHEN (100 - v_percentile) <= 10 THEN 5
    WHEN (100 - v_percentile) <= 15 THEN 10
    WHEN (100 - v_percentile) <= 20 THEN 15
    WHEN (100 - v_percentile) <= 25 THEN 20
    WHEN (100 - v_percentile) <= 30 THEN 25
    WHEN (100 - v_percentile) <= 40 THEN 30
    WHEN (100 - v_percentile) <= 50 THEN 40
    ELSE 50
  END;
  
  IF v_next_tier_pct IS NOT NULL THEN
    v_next_tier_minutes := v_all_minutes[greatest(1, round(v_total_users * v_next_tier_pct / 100.0)::integer)];
    v_next_tier_minutes := greatest(0, v_next_tier_minutes - v_user_minutes);
  END IF;
  
  RETURN jsonb_build_object(
    'user_minutes', v_user_minutes,
    'percentile', (100 - v_percentile)::integer,
    'rank', v_rank,
    'total_users', v_total_users,
    'next_tier_pct', v_next_tier_pct,
    'minutes_to_next_tier', coalesce(v_next_tier_minutes, 0)
  );
END;
$$;
