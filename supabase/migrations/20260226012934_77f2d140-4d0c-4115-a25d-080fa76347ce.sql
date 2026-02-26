
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_sender
ON direct_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver
ON direct_messages(receiver_id);

CREATE INDEX IF NOT EXISTS idx_notes_author_visibility_created
ON notes(author_id, visibility, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_note_comments_note_author
ON note_comments(note_id, author_id);
