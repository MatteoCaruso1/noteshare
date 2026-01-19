-- Drop the existing overly complex INSERT policy
DROP POLICY IF EXISTS "Users can log their own page views" ON public.page_views;

-- Create a simplified INSERT policy that directly checks user_id = auth.uid()
CREATE POLICY "Users can log their own page views"
ON public.page_views
FOR INSERT
TO public
WITH CHECK (user_id = auth.uid());