CREATE INDEX IF NOT EXISTS idx_practice_sessions_active_user
ON practice_sessions (user_id)
WHERE is_active = true;