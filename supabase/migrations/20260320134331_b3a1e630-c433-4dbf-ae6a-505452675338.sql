
ALTER TABLE public.daily_focus ADD COLUMN IF NOT EXISTS focus_title text NOT NULL DEFAULT '';
ALTER TABLE public.focus_backlog ADD COLUMN IF NOT EXISTS focus_title text NOT NULL DEFAULT '';
