CREATE OR REPLACE FUNCTION public.get_profile_achievement_stats(p_profile_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total_notes', (
      SELECT count(*)::int FROM public.notes WHERE author_id = p_profile_id
    ),
    'total_minutes', (
      SELECT coalesce(sum(
        EXTRACT(EPOCH FROM (ps.ended_at - ps.started_at)) / 60
        - coalesce(ps.paused_duration_ms, 0) / 60000.0
      )::int, 0)
      FROM public.practice_sessions ps
      WHERE ps.user_id = p_profile_id
        AND ps.ended_at IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.notes n WHERE n.session_id = ps.id)
    ),
    'best_streak', (
      SELECT coalesce(max(m), 0)
      FROM (
        SELECT unnest(
          ARRAY(
            SELECT key::int FROM jsonb_each_text(
              coalesce(
                (SELECT streak_achievement_counts FROM public.profiles WHERE id = p_profile_id),
                '{}'::jsonb
              )
            ) WHERE value::int > 0
          )
        ) AS m
      ) sub
    )
  );
$$;