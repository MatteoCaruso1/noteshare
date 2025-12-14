-- Fix the function search path warning
CREATE OR REPLACE FUNCTION public.update_note_comment_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE notes SET comment_count = comment_count + 1 WHERE id = NEW.note_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE notes SET comment_count = comment_count - 1 WHERE id = OLD.note_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;