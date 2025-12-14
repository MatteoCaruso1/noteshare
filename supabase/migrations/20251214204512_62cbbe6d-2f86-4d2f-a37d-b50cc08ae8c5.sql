-- Add column to store audio file names (corresponding by index to audio_files)
ALTER TABLE public.notes 
ADD COLUMN audio_file_names text[] DEFAULT '{}'::text[];