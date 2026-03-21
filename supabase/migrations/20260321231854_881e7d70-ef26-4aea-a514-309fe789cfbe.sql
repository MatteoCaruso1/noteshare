-- Add focus_title_snapshot column to notes
ALTER TABLE public.notes ADD COLUMN focus_title_snapshot text DEFAULT NULL;

-- Backfill existing notes that have a focus_entry_id with the title from daily_focus
UPDATE public.notes n
SET focus_title_snapshot = df.focus_title
FROM public.daily_focus df
WHERE n.focus_entry_id = df.id
  AND df.focus_title IS NOT NULL
  AND df.focus_title != '';