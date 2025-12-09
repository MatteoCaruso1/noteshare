-- Create moderation status enum
CREATE TYPE public.moderation_status AS ENUM ('pending', 'approved', 'removed');

-- Create moderation_flags table for AI-assisted moderation
CREATE TABLE public.moderation_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  confidence DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
  status moderation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.moderation_flags ENABLE ROW LEVEL SECURITY;

-- Moderation flags are viewable by everyone (for showing warnings)
CREATE POLICY "Moderation flags are viewable by everyone"
ON public.moderation_flags
FOR SELECT
USING (true);

-- Index for quick lookups
CREATE INDEX idx_moderation_flags_target ON public.moderation_flags(target_type, target_id);
CREATE INDEX idx_moderation_flags_status ON public.moderation_flags(status);

-- Add persona_profile column to profiles for detailed AI behavior
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS persona_profile TEXT;