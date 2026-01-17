-- Create muted_friends table to track which friends' posts are hidden
CREATE TABLE public.muted_friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_friend_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, muted_friend_id)
);

-- Enable Row Level Security
ALTER TABLE public.muted_friends ENABLE ROW LEVEL SECURITY;

-- Users can only see their own muted list
CREATE POLICY "Users can view their own muted friends"
ON public.muted_friends
FOR SELECT
USING (auth.uid() = user_id);

-- Users can mute friends
CREATE POLICY "Users can mute friends"
ON public.muted_friends
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unmute friends
CREATE POLICY "Users can unmute friends"
ON public.muted_friends
FOR DELETE
USING (auth.uid() = user_id);