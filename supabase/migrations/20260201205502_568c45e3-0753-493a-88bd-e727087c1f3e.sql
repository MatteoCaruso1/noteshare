-- Create weekly_goals table for premium weekly practice goals
CREATE TABLE public.weekly_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- Monday of the week
  target_minutes INTEGER NOT NULL DEFAULT 0,
  skipped BOOLEAN NOT NULL DEFAULT false, -- True if user clicked "No Goal"
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start) -- One goal per user per week
);

-- Enable Row Level Security
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own weekly goals"
  ON public.weekly_goals
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = weekly_goals.user_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own weekly goals"
  ON public.weekly_goals
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = weekly_goals.user_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own weekly goals"
  ON public.weekly_goals
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = weekly_goals.user_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own weekly goals"
  ON public.weekly_goals
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = weekly_goals.user_id
    AND profiles.user_id = auth.uid()
  ));

-- Add updated_at trigger
CREATE TRIGGER update_weekly_goals_updated_at
  BEFORE UPDATE ON public.weekly_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();