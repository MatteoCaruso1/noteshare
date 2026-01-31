-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;

-- Create a permissive INSERT policy (default behavior)
CREATE POLICY "Users can create groups"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (owner_id = my_profile_id());