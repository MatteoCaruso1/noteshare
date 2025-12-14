-- Drop the old check constraint first
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_visibility_check;

-- Update all notes to 'friends' visibility (now that constraint is removed)
UPDATE notes SET visibility = 'friends';

-- Add the new check constraint with only 'private' and 'friends'
ALTER TABLE notes ADD CONSTRAINT notes_visibility_check CHECK (visibility IN ('private', 'friends'));