-- Ensure practice-media bucket is public so public URLs resolve correctly
update storage.buckets
set public = true
where id = 'practice-media';