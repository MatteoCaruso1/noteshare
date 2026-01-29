-- Create applause table for the "kudos" system
CREATE TABLE public.applause (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(note_id, user_id)
);

-- Enable RLS
ALTER TABLE public.applause ENABLE ROW LEVEL SECURITY;

-- Users can view applause on notes they can see (simplified - visible if the note is visible)
CREATE POLICY "Users can view applause on visible notes"
ON public.applause
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM notes n
    WHERE n.id = applause.note_id
    AND (
      -- Own notes
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = n.author_id AND profiles.user_id = auth.uid())
      -- Public notes
      OR n.visibility = 'public'
      -- Friends notes
      OR (n.visibility = 'friends' AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
        AND (
          (f.requester_id = n.author_id AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = f.addressee_id AND profiles.user_id = auth.uid()))
          OR (f.addressee_id = n.author_id AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = f.requester_id AND profiles.user_id = auth.uid()))
        )
      ))
    )
  )
);

-- Users can give applause
CREATE POLICY "Users can give applause"
ON public.applause
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.id = applause.user_id)
);

-- Users can remove their own applause
CREATE POLICY "Users can remove their own applause"
ON public.applause
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.id = applause.user_id)
);

-- Add index for performance
CREATE INDEX idx_applause_note_id ON public.applause(note_id);
CREATE INDEX idx_applause_user_id ON public.applause(user_id);