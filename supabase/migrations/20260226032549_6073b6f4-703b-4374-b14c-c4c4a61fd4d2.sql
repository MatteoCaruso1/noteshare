
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_logged_first_note boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_added_first_friend boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_logged_ten_notes boolean NOT NULL DEFAULT false;
