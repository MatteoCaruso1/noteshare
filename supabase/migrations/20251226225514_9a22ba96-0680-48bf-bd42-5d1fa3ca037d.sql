-- Create a table for focus backlog entries
CREATE TABLE public.focus_backlog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  focus_text TEXT NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  original_focus_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.focus_backlog ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own backlog entries" 
ON public.focus_backlog 
FOR SELECT 
USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = focus_backlog.user_id AND profiles.user_id = auth.uid()));

CREATE POLICY "Users can create their own backlog entries" 
ON public.focus_backlog 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = focus_backlog.user_id AND profiles.user_id = auth.uid()));

CREATE POLICY "Users can delete their own backlog entries" 
ON public.focus_backlog 
FOR DELETE 
USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = focus_backlog.user_id AND profiles.user_id = auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_focus_backlog_user_saved ON public.focus_backlog(user_id, saved_at DESC);