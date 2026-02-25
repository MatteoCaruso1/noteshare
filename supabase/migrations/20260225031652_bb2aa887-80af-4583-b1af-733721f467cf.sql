
-- P0: Replace the complex applause SELECT policy with a simple one
-- that delegates visibility to notes RLS (PostgreSQL applies notes RLS inside EXISTS automatically)
DROP POLICY IF EXISTS "Users can view applause on visible notes" ON applause;

CREATE POLICY "Users can view applause on visible notes"
ON applause
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM notes WHERE notes.id = applause.note_id
  )
);

-- P2: Add composite index on friendships for faster RLS friendship checks
CREATE INDEX IF NOT EXISTS idx_friendships_pair_status
ON friendships(requester_id, addressee_id, status);

-- Also add reverse direction index for bidirectional lookups
CREATE INDEX IF NOT EXISTS idx_friendships_pair_status_reverse
ON friendships(addressee_id, requester_id, status);
