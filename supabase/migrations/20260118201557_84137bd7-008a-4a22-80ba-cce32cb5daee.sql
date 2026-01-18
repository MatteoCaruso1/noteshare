-- Create atomic claim_streak_milestone function
-- This ensures duplicate milestone claims are impossible
CREATE OR REPLACE FUNCTION public.claim_streak_milestone(
  p_profile_id uuid,
  p_milestone int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_updated_count int;
BEGIN
  -- Verify ownership: the caller must own this profile
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_profile_id 
    AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('claimed', false, 'error', 'unauthorized');
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
$$;