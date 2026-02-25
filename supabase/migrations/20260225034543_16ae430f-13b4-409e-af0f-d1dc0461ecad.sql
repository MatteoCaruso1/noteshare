
-- Drop the nested friendship SELECT policy
DROP POLICY IF EXISTS "Friends can view session info for shared notes" ON practice_sessions;

-- Drop the existing own-sessions policy (will be merged into new one)
DROP POLICY IF EXISTS "Users can view their own sessions" ON practice_sessions;

-- Single delegated SELECT policy
CREATE POLICY "View own or visible sessions"
ON practice_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = practice_sessions.user_id
    AND profiles.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM notes
    WHERE notes.session_id = practice_sessions.id
  )
);
