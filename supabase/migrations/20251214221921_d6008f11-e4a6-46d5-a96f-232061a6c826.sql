-- Add comment_count column to notes table
ALTER TABLE public.notes ADD COLUMN comment_count integer NOT NULL DEFAULT 0;

-- Create trigger function to update comment count
CREATE OR REPLACE FUNCTION public.update_note_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.notes SET comment_count = comment_count + 1 WHERE id = NEW.note_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.notes SET comment_count = comment_count - 1 WHERE id = OLD.note_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on note_comments table
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.note_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_note_comment_count();

-- Backfill existing comment counts
UPDATE public.notes n
SET comment_count = (
  SELECT COUNT(*) FROM public.note_comments nc WHERE nc.note_id = n.id
);