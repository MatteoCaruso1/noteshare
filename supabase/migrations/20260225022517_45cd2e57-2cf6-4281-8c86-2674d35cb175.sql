
-- Notes table: core columns used in RLS and queries
CREATE INDEX IF NOT EXISTS idx_notes_author_id ON public.notes (author_id);
CREATE INDEX IF NOT EXISTS idx_notes_session_id ON public.notes (session_id);
CREATE INDEX IF NOT EXISTS idx_notes_project_id ON public.notes (project_id);
CREATE INDEX IF NOT EXISTS idx_notes_visibility ON public.notes (visibility);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes (created_at DESC);

-- Note comments: columns used in RLS and queries
CREATE INDEX IF NOT EXISTS idx_note_comments_note_id ON public.note_comments (note_id);
CREATE INDEX IF NOT EXISTS idx_note_comments_author_id ON public.note_comments (author_id);

-- Friendships: standalone index on addressee_id for reverse lookups
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id ON public.friendships (addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships (status);
