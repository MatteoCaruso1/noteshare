-- Create daily_focus table for storing user's daily focus text
CREATE TABLE public.daily_focus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  focus_date DATE NOT NULL,
  focus_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, focus_date)
);

-- Add index for faster lookups by user and date
CREATE INDEX idx_daily_focus_user_date ON public.daily_focus(user_id, focus_date DESC);

-- Enable Row Level Security
ALTER TABLE public.daily_focus ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_focus
CREATE POLICY "Users can view their own focus entries" 
ON public.daily_focus 
FOR SELECT 
USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = daily_focus.user_id AND profiles.user_id = auth.uid()));

CREATE POLICY "Users can create their own focus entries" 
ON public.daily_focus 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = daily_focus.user_id AND profiles.user_id = auth.uid()));

CREATE POLICY "Users can update their own focus entries" 
ON public.daily_focus 
FOR UPDATE 
USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = daily_focus.user_id AND profiles.user_id = auth.uid()));

CREATE POLICY "Users can delete their own focus entries" 
ON public.daily_focus 
FOR DELETE 
USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = daily_focus.user_id AND profiles.user_id = auth.uid()));

-- Add trigger for automatic timestamp updates on daily_focus
CREATE TRIGGER update_daily_focus_updated_at
BEFORE UPDATE ON public.daily_focus
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add focus fields to notes table
ALTER TABLE public.notes 
ADD COLUMN focus_entry_id UUID REFERENCES public.daily_focus(id),
ADD COLUMN focus_date DATE,
ADD COLUMN focus_text_snapshot TEXT;

-- Add focus fields to practice_sessions table
ALTER TABLE public.practice_sessions 
ADD COLUMN focus_entry_id UUID REFERENCES public.daily_focus(id),
ADD COLUMN focus_date DATE,
ADD COLUMN focus_text_snapshot TEXT;