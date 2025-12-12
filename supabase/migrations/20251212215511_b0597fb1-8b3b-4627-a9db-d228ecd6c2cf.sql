-- Create friendships table for mutual friend relationships
CREATE TABLE public.friendships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can view friendships they are part of
CREATE POLICY "Users can view their friendships"
ON public.friendships
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = friendships.requester_id AND profiles.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = friendships.addressee_id AND profiles.user_id = auth.uid())
);

-- Users can create friendship requests
CREATE POLICY "Users can create friendship requests"
ON public.friendships
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = friendships.requester_id AND profiles.user_id = auth.uid())
);

-- Users can update friendships they received (to accept/reject)
CREATE POLICY "Users can respond to friendship requests"
ON public.friendships
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = friendships.addressee_id AND profiles.user_id = auth.uid())
);

-- Users can delete friendships they are part of
CREATE POLICY "Users can delete their friendships"
ON public.friendships
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = friendships.requester_id AND profiles.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = friendships.addressee_id AND profiles.user_id = auth.uid())
);

-- Create trigger for updated_at
CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add 'friends' to notes visibility options by updating the check constraint
-- First, we need to check if there's a constraint and update it
-- Notes visibility already supports text, so we just need RLS policy for friends

-- Create policy for friends to view notes with 'friends' visibility
CREATE POLICY "Friends can view friends-only notes"
ON public.notes
FOR SELECT
USING (
  visibility = 'friends' AND
  EXISTS (
    SELECT 1 FROM friendships f
    JOIN profiles p ON p.id = f.requester_id OR p.id = f.addressee_id
    WHERE f.status = 'accepted'
    AND (
      (f.requester_id = notes.author_id AND EXISTS (SELECT 1 FROM profiles WHERE id = f.addressee_id AND user_id = auth.uid()))
      OR (f.addressee_id = notes.author_id AND EXISTS (SELECT 1 FROM profiles WHERE id = f.requester_id AND user_id = auth.uid()))
    )
  )
);