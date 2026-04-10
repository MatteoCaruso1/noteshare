
-- Table for benchmark data (synthetic + real aggregation cache)
CREATE TABLE public.monthly_practice_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,
  minutes_practiced integer NOT NULL DEFAULT 0,
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No RLS needed - accessed only via security definer function
ALTER TABLE public.monthly_practice_benchmarks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read (for the function)
CREATE POLICY "Anyone can read benchmarks"
  ON public.monthly_practice_benchmarks
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to get a user's monthly ranking
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
  v_result jsonb;
BEGIN
  -- Current month as YYYY-MM
  v_current_month := to_char(now(), 'YYYY-MM');
  
  -- Calculate user's total minutes this month from practice_sessions
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
  
  -- Gather all minutes: real users this month + synthetic benchmarks
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
    
    -- Synthetic benchmarks for current month
    SELECT minutes_practiced as mins
    FROM public.monthly_practice_benchmarks
    WHERE month = v_current_month AND is_synthetic = true
    
    UNION ALL
    
    -- Include current user
    SELECT v_user_minutes as mins
  ) sub
  WHERE mins IS NOT NULL;
  
  -- If no data at all
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
  
  -- Count how many have MORE minutes than user (strict)
  SELECT count(*)::integer INTO v_rank
  FROM unnest(v_all_minutes) as m
  WHERE m > v_user_minutes;
  
  v_rank := v_rank + 1; -- 1-indexed rank
  
  -- Percentile: what % of users you're ahead of
  v_percentile := round(((v_total_users - v_rank)::numeric / v_total_users) * 100);
  
  -- Calculate next tier (next lower percentile bracket)
  -- e.g., if at 60%, next tier is top 50% (need to beat more people)
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
  
  -- Calculate minutes needed for next tier
  IF v_next_tier_pct IS NOT NULL THEN
    v_next_tier_minutes := v_all_minutes[greatest(1, round(v_total_users * v_next_tier_pct / 100.0)::integer)];
    v_next_tier_minutes := greatest(0, v_next_tier_minutes - v_user_minutes);
  END IF;
  
  RETURN jsonb_build_object(
    'user_minutes', v_user_minutes,
    'percentile', (100 - v_percentile)::integer, -- "top X%"
    'rank', v_rank,
    'total_users', v_total_users,
    'next_tier_pct', v_next_tier_pct,
    'minutes_to_next_tier', coalesce(v_next_tier_minutes, 0)
  );
END;
$$;

-- Seed 101 synthetic benchmarks for current month
-- Equal distribution from 2hrs (120min) to 28hrs (1680min) pace
-- Since we're mid-month, scale by day-of-month / days-in-month
INSERT INTO public.monthly_practice_benchmarks (month, minutes_practiced, is_synthetic)
SELECT 
  to_char(now(), 'YYYY-MM'),
  -- Scale full-month target by proportion of month elapsed
  round(
    (120 + (i * (1680 - 120)::numeric / 100)) 
    * (extract(day from now()) / extract(day from (date_trunc('month', now()) + interval '1 month' - interval '1 day')))
  )::integer,
  true
FROM generate_series(0, 100) as i;
