-- Add video_name and video_thumbnail_path columns to notes
ALTER TABLE public.notes ADD COLUMN video_name text DEFAULT NULL;
ALTER TABLE public.notes ADD COLUMN video_thumbnail_path text DEFAULT NULL;