-- Add a JSONB column to track how many times each streak milestone was achieved
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS streak_achievement_counts jsonb DEFAULT '{}'::jsonb;