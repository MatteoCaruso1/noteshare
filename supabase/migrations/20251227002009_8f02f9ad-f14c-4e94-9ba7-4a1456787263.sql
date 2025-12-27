-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can view their own media" ON storage.objects;
DROP POLICY IF EXISTS "Friends can view shared media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload practice media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update practice media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete practice media" ON storage.objects;

-- Create corrected policies that use profile.id instead of auth.uid() for folder matching
-- Users can upload media to their own folder (profile.id)
CREATE POLICY "Users can upload their own media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'practice-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Users can view their own media
CREATE POLICY "Users can view their own media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'practice-media' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Friends can view shared media (files owned by accepted friends)
CREATE POLICY "Friends can view shared media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'practice-media' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.profiles owner_profile
    WHERE owner_profile.id::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
      AND (
        (f.requester_id = owner_profile.id AND f.addressee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
        OR 
        (f.addressee_id = owner_profile.id AND f.requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
      )
    )
  )
);

-- Users can update their own media
CREATE POLICY "Users can update their own media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'practice-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Users can delete their own media
CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'practice-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);