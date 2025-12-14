-- Fix 1: Make practice-media bucket private
UPDATE storage.buckets SET public = false WHERE id = 'practice-media';

-- Fix 2: Update note_comments RLS to check note visibility
-- First drop the existing permissive policy
DROP POLICY IF EXISTS "Users can view comments on visible notes" ON public.note_comments;

-- Create proper policy that checks note visibility
CREATE POLICY "Users can view comments on their own notes"
ON public.note_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM notes 
    WHERE notes.id = note_comments.note_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = notes.author_id 
      AND profiles.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view comments on friends notes"
ON public.note_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM notes 
    WHERE notes.id = note_comments.note_id 
    AND notes.visibility = 'friends'
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
      AND (
        (f.requester_id = notes.author_id AND EXISTS (
          SELECT 1 FROM profiles WHERE profiles.id = f.addressee_id AND profiles.user_id = auth.uid()
        ))
        OR
        (f.addressee_id = notes.author_id AND EXISTS (
          SELECT 1 FROM profiles WHERE profiles.id = f.requester_id AND profiles.user_id = auth.uid()
        ))
      )
    )
  )
);

CREATE POLICY "Users can view comments on public notes"
ON public.note_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM notes 
    WHERE notes.id = note_comments.note_id 
    AND notes.visibility = 'public'
  )
);

-- Fix 3: Update storage policies for private bucket access
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;

-- Create policy for authenticated users to view their own media
CREATE POLICY "Users can view their own media"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'practice-media' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy for viewing media from friends' notes
CREATE POLICY "Users can view friends media"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'practice-media'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM friendships f
    JOIN profiles p ON (p.id = f.requester_id OR p.id = f.addressee_id)
    WHERE f.status = 'accepted'
    AND (storage.foldername(name))[1] = p.id::text
    AND (
      (f.requester_id = p.id AND EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = f.addressee_id AND profiles.user_id = auth.uid()
      ))
      OR
      (f.addressee_id = p.id AND EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = f.requester_id AND profiles.user_id = auth.uid()
      ))
    )
  )
);