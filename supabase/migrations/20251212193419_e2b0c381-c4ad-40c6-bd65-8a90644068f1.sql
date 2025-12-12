-- Create goals table for near-term and long-term goals
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('near-term', 'long-term')),
  content TEXT NOT NULL,
  target_date DATE,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Users can view their own goals
CREATE POLICY "Users can view their own goals"
ON public.goals
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = goals.user_id AND profiles.user_id = auth.uid()
));

-- Users can view public goals
CREATE POLICY "Users can view public goals"
ON public.goals
FOR SELECT
USING (visibility = 'public');

-- Users can create their own goals
CREATE POLICY "Users can create their own goals"
ON public.goals
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = goals.user_id AND profiles.user_id = auth.uid()
));

-- Users can update their own goals
CREATE POLICY "Users can update their own goals"
ON public.goals
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = goals.user_id AND profiles.user_id = auth.uid()
));

-- Users can delete their own goals
CREATE POLICY "Users can delete their own goals"
ON public.goals
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = goals.user_id AND profiles.user_id = auth.uid()
));