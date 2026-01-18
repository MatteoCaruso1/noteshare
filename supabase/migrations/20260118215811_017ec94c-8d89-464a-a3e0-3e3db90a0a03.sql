-- One-time correction: Reset the inflated streak_achievement_counts for milestone 30 back to 1
-- This fixes the bug where the count was incorrectly incremented multiple times
UPDATE public.profiles
SET streak_achievement_counts = jsonb_set(
  COALESCE(streak_achievement_counts, '{}'::jsonb),
  '{30}',
  '1'::jsonb
)
WHERE streak_achievement_counts ? '30'
  AND (streak_achievement_counts->>'30')::int > 1;

-- Also update the claim_streak_milestone function to add an extra safety check
-- Only allow claiming if current_streak >= p_milestone (prevents edge cases)
CREATE OR REPLACE FUNCTION public.claim_streak_milestone(p_profile_id uuid, p_milestone integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_updated_count int;
  v_current_streak int;
BEGIN
  -- Verify ownership: the caller must own this profile
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_profile_id 
    AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('claimed', false, 'error', 'unauthorized');
  END IF;

  -- Get current streak and verify it's high enough
  SELECT current_streak INTO v_current_streak
  FROM profiles
  WHERE id = p_profile_id;
  
  IF v_current_streak IS NULL OR v_current_streak < p_milestone THEN
    RETURN jsonb_build_object('claimed', false, 'error', 'streak_too_low');
  END IF;

  -- Atomic update: only if milestone NOT already in celebrated_streak_milestones
  UPDATE profiles
  SET 
    celebrated_streak_milestones = array_append(celebrated_streak_milestones, p_milestone),
    streak_achievement_counts = COALESCE(streak_achievement_counts, '{}'::jsonb) || 
      jsonb_build_object(
        p_milestone::text, 
        COALESCE((streak_achievement_counts->>p_milestone::text)::int, 0) + 1
      )
  WHERE id = p_profile_id
    AND NOT (celebrated_streak_milestones @> ARRAY[p_milestone]);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Return result with claimed flag
  SELECT jsonb_build_object(
    'claimed', v_updated_count > 0,
    'celebrated_streak_milestones', celebrated_streak_milestones,
    'streak_achievement_counts', streak_achievement_counts
  )
  INTO v_result
  FROM profiles
  WHERE id = p_profile_id;

  RETURN v_result;
END;
$function$;