-- Drop the conflicting policy and recreate
DROP POLICY IF EXISTS "Users can view friends media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view friends' media" ON storage.objects;

-- Recreate the friends media viewing policy
CREATE POLICY "Friends can view shared media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'practice-media'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM friendships f
    JOIN profiles p ON (
      (f.requester_id = p.id AND f.addressee_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
      OR (f.addressee_id = p.id AND f.requester_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    )
    WHERE f.status = 'accepted'
    AND p.user_id::text = (storage.foldername(name))[1]
  )
);

-- Recreate delete policy (may have been dropped)
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'practice-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);