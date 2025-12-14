-- Add RLS policy for friends to view each other's projects based on friendships table
CREATE POLICY "Friends can view friends projects via friendships"
ON public.projects
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM friendships f
    JOIN profiles p ON (p.id = f.requester_id OR p.id = f.addressee_id)
    WHERE f.status = 'accepted'
    AND (
      (f.requester_id = projects.owner_id AND EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = f.addressee_id AND profiles.user_id = auth.uid()
      ))
      OR
      (f.addressee_id = projects.owner_id AND EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = f.requester_id AND profiles.user_id = auth.uid()
      ))
    )
  )
);