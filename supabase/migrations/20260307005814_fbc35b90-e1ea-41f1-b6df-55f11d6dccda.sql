
ALTER TABLE public.note_comments
ADD COLUMN parent_comment_id uuid REFERENCES public.note_comments(id) ON DELETE CASCADE;

CREATE INDEX idx_note_comments_parent ON public.note_comments(parent_comment_id);
