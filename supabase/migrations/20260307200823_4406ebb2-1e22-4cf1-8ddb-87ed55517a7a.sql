ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS has_seen_feedback_prompt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_seen_share_education boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_completed_onboarding boolean NOT NULL DEFAULT false;