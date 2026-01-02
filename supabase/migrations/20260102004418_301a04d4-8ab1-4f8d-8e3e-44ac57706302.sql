ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS celebrated_streak_milestones integer[] NOT NULL DEFAULT '{}'::integer[];

CREATE INDEX IF NOT EXISTS idx_profiles_celebrated_streak_milestones ON public.profiles USING GIN (celebrated_streak_milestones);