-- Composite index for the primary notes query: user's notes ordered by created_at
CREATE INDEX IF NOT EXISTS idx_notes_author_created
ON public.notes (author_id, created_at DESC);

-- Composite index for practice_sessions ordered by user + started_at (stats queries)
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_started_asc
ON public.notes USING btree (author_id, created_at DESC)
WHERE session_id IS NOT NULL;