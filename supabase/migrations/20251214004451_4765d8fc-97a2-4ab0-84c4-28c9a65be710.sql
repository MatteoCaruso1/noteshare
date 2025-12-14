-- Add gig_id to notes table to allow linking notes to gigs
ALTER TABLE public.notes 
ADD COLUMN gig_id uuid REFERENCES public.promo_posts(id) ON DELETE SET NULL;

-- Add collaborator_ids to practice_sessions for tagging collaborators on sessions
ALTER TABLE public.practice_sessions 
ADD COLUMN collaborator_ids uuid[] DEFAULT '{}'::uuid[];

-- Create index for gig_id lookups
CREATE INDEX idx_notes_gig_id ON public.notes(gig_id);

-- Update RLS policy for notes to allow collaborators to view notes linked to gigs they're tagged on
CREATE POLICY "Collaborators can view notes linked to their gigs" 
ON public.notes 
FOR SELECT 
USING (
  gig_id IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.promo_posts pp
    WHERE pp.id = notes.gig_id
    AND (auth.uid())::text IN (
      SELECT (p.user_id)::text 
      FROM profiles p 
      WHERE p.id = ANY(pp.collaborator_ids)
    )
  )
);