-- Drop existing visibility-based RLS policy first
DROP POLICY IF EXISTS "Users can view public goals" ON public.goals;

-- Remove visibility column (goals are always private now)
ALTER TABLE public.goals DROP COLUMN IF EXISTS visibility;