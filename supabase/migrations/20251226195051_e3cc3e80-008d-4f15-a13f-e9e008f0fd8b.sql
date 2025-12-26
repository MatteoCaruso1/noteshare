-- Add pause functionality fields to practice_sessions
ALTER TABLE public.practice_sessions 
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS paused_duration_ms BIGINT DEFAULT 0;