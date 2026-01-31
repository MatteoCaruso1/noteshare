-- Drop the current policy that uses my_profile_id()
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;

-- Create a new policy using the proven inline EXISTS pattern
CREATE POLICY "Users can create groups"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = groups.owner_id 
      AND profiles.user_id = auth.uid()
  )
);