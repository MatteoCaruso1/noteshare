-- Create direct_messages table for basic DM feature
CREATE TABLE public.direct_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view their messages"
ON public.direct_messages
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = direct_messages.sender_id AND profiles.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = direct_messages.receiver_id AND profiles.user_id = auth.uid())
);

-- Users can send messages
CREATE POLICY "Users can send messages"
ON public.direct_messages
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = direct_messages.sender_id AND profiles.user_id = auth.uid())
);

-- Users can mark their received messages as read
CREATE POLICY "Users can update their received messages"
ON public.direct_messages
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = direct_messages.receiver_id AND profiles.user_id = auth.uid())
);

-- Add collaborator_ids to promo_posts for tagging collaborators on gigs
ALTER TABLE public.promo_posts ADD COLUMN collaborator_ids uuid[] DEFAULT '{}'::uuid[];