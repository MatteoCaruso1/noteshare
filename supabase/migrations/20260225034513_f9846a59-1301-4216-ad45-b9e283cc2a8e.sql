
-- Drop all existing SELECT policies on note_comments
DROP POLICY IF EXISTS "Users can view comments on friends notes" ON note_comments;
DROP POLICY IF EXISTS "Users can view comments on public notes" ON note_comments;
DROP POLICY IF EXISTS "Users can view comments on their own notes" ON note_comments;

-- Replace with single delegated policy
CREATE POLICY "View comments on visible notes"
ON note_comments
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM notes
    WHERE notes.id = note_comments.note_id
  )
);
