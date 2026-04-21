ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS background_pack TEXT DEFAULT 'music',
ADD COLUMN IF NOT EXISTS background_density TEXT DEFAULT 'normal';