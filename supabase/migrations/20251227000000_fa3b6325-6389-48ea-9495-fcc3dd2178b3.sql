-- Drop the overly permissive public access policy that allows anyone to view all media
DROP POLICY IF EXISTS "Public read access to practice media" ON storage.objects;