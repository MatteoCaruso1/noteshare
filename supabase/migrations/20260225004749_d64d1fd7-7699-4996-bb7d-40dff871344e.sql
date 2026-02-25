
-- Add is_mobile column to practice_sessions for mobile tracking
ALTER TABLE public.practice_sessions
ADD COLUMN is_mobile boolean NOT NULL DEFAULT false;
