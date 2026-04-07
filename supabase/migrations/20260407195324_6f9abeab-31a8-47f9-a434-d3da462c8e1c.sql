ALTER TABLE public.profiles
ADD COLUMN seen_achievement_ids text[] NOT NULL DEFAULT '{}';