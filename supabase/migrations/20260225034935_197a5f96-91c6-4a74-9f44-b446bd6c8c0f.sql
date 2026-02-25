
-- Drop the existing friends visibility policy
DROP POLICY IF EXISTS "Friends can view friends-only notes" ON notes;

-- Recreate without the unnecessary JOIN to profiles
CREATE POLICY "Friends can view friends-only notes"
ON notes
FOR SELECT
USING (
  visibility = 'friends'
  AND EXISTS (
    SELECT 1
    FROM friendships f
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
);
