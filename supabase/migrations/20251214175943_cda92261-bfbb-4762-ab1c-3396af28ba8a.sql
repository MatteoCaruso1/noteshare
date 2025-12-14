-- Create practice-media storage bucket
insert into storage.buckets (id, name, public)
values ('practice-media', 'practice-media', true)
on conflict (id) do nothing;

-- Enable public read access to media files
create policy "Public read access to practice media"
  on storage.objects
  for select
  using (bucket_id = 'practice-media');

-- Allow authenticated users to upload media files
create policy "Authenticated upload practice media"
  on storage.objects
  for insert
  with check (bucket_id = 'practice-media');

-- Allow authenticated users to update media files
create policy "Authenticated update practice media"
  on storage.objects
  for update
  using (bucket_id = 'practice-media');

-- Allow authenticated users to delete media files
create policy "Authenticated delete practice media"
  on storage.objects
  for delete
  using (bucket_id = 'practice-media');