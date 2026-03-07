
-- Create gig_comments table
CREATE TABLE public.gig_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES public.promo_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gig_comments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view comments on gigs they can see
CREATE POLICY "Authenticated users can view gig comments"
ON public.gig_comments
FOR SELECT
TO authenticated
USING (true);

-- Users can create comments
CREATE POLICY "Users can create gig comments"
ON public.gig_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = gig_comments.author_id
    AND profiles.user_id = auth.uid()
  )
);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own gig comments"
ON public.gig_comments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = gig_comments.author_id
    AND profiles.user_id = auth.uid()
  )
);

-- Gig owners can delete any comment on their gig
CREATE POLICY "Gig owners can delete any gig comment"
ON public.gig_comments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM promo_posts pp
    JOIN profiles p ON p.id = pp.author_id
    WHERE pp.id = gig_comments.gig_id
    AND p.user_id = auth.uid()
  )
);

-- Add a comment_count column to promo_posts for convenience
ALTER TABLE public.promo_posts ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0;

-- Trigger to auto-update comment count
CREATE OR REPLACE FUNCTION public.update_gig_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE promo_posts SET comment_count = comment_count + 1 WHERE id = NEW.gig_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE promo_posts SET comment_count = comment_count - 1 WHERE id = OLD.gig_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_gig_comment_count_trigger
AFTER INSERT OR DELETE ON public.gig_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_gig_comment_count();
