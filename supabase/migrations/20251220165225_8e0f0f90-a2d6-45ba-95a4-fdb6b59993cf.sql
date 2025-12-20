-- Allow friends to view practice sessions that are linked to notes they can see
-- This is needed so friends can see practice session duration on shared notes
CREATE POLICY "Friends can view session info for shared notes"
ON public.practice_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM notes
    WHERE notes.session_id = practice_sessions.id
    AND notes.visibility = 'friends'
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
      AND (
        (f.requester_id = notes.author_id AND EXISTS (
          SELECT 1 FROM profiles WHERE profiles.id = f.addressee_id AND profiles.user_id = auth.uid()
        ))
        OR
        (f.addressee_id = notes.author_id AND EXISTS (
          SELECT 1 FROM profiles WHERE profiles.id = f.requester_id AND profiles.user_id = auth.uid()
        ))
      )
    )
  )
);