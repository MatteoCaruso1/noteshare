-- Allow users to delete their own practice sessions so stats reflect deletions
CREATE POLICY "Users can delete their own sessions"
ON public.practice_sessions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = practice_sessions.user_id
      AND profiles.user_id = auth.uid()
  )
);