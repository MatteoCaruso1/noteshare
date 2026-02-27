ALTER TABLE public.notes
ADD COLUMN private_audio_indices integer[] NOT NULL DEFAULT '{}';