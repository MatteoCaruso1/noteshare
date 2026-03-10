
-- Add video_path column to notes table
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS video_path TEXT DEFAULT NULL;

-- Create notes-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('notes-media', 'notes-media', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for notes-media bucket
-- Users can upload to their own folder
CREATE POLICY "Users can upload their own videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'notes-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own videos
CREATE POLICY "Users can view their own videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'notes-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own videos
CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'notes-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
