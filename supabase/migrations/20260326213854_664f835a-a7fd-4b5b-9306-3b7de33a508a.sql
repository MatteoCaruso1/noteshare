
CREATE POLICY "Users can update their own backlog entries"
ON public.focus_backlog
FOR UPDATE
TO public
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = focus_backlog.user_id
  AND profiles.user_id = auth.uid()
));
