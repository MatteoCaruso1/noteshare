-- Create a table to track note shares between users
-- When User A practices with User B, User A can share their note with User B
-- User B receives a notification and can accept/reject to have it appear on their timeline

CREATE TABLE public.note_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  shared_by_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  
  -- Prevent duplicate shares
  UNIQUE(note_id, shared_with_id)
);

-- Enable Row Level Security
ALTER TABLE public.note_shares ENABLE ROW LEVEL SECURITY;

-- Users can view shares where they are the sharer or the recipient
CREATE POLICY "Users can view their own shares"
ON public.note_shares
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = note_shares.shared_by_id
    AND profiles.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = note_shares.shared_with_id
    AND profiles.user_id = auth.uid()
  )
);

-- Users can create shares for their own notes
CREATE POLICY "Users can share their own notes"
ON public.note_shares
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = note_shares.shared_by_id
    AND profiles.user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM notes
    WHERE notes.id = note_shares.note_id
    AND notes.author_id = note_shares.shared_by_id
  )
);

-- Recipients can update the status of shares sent to them
CREATE POLICY "Recipients can respond to shares"
ON public.note_shares
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = note_shares.shared_with_id
    AND profiles.user_id = auth.uid()
  )
);

-- Sharers can delete their own shares
CREATE POLICY "Sharers can delete their shares"
ON public.note_shares
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = note_shares.shared_by_id
    AND profiles.user_id = auth.uid()
  )
);

-- Create index for efficient queries
CREATE INDEX idx_note_shares_shared_with ON public.note_shares(shared_with_id, status);
CREATE INDEX idx_note_shares_note ON public.note_shares(note_id);