-- Set the practice-media bucket to private to enforce RLS policies
UPDATE storage.buckets SET public = false WHERE id = 'practice-media';