-- Phase 2: Create SECURITY DEFINER visibility function
-- Covers ALL note visibility paths from current notes RLS:
-- 1. Own notes, 2. Public, 3. Friends-only, 4. Project collaborators,
-- 5. Gig collaborators, 6. Goal-linked, 7. Collaborators visibility

CREATE OR REPLACE FUNCTION public.can_view_note(p_note_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.notes n
    WHERE n.id = p_note_id
    AND (
      -- 1. Own note (fast path)
      n.author_id = my_profile_id()

      -- 2. Public notes
      OR n.visibility = 'public'

      -- 3. Friends-only notes
      OR (
        n.visibility = 'friends'
        AND EXISTS (
          SELECT 1
          FROM public.friendships f
          WHERE f.status = 'accepted'
          AND (
            (f.requester_id = n.author_id AND f.addressee_id = my_profile_id())
            OR
            (f.addressee_id = n.author_id AND f.requester_id = my_profile_id())
          )
        )
      )

      -- 4. Project collaborator notes
      OR (
        n.project_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.projects pr
          WHERE pr.id = n.project_id
          AND my_profile_id() = ANY(pr.collaborator_ids)
        )
      )

      -- 5. Gig collaborator notes
      OR (
        n.gig_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.promo_posts pp
          WHERE pp.id = n.gig_id
          AND my_profile_id() = ANY(pp.collaborator_ids)
        )
      )

      -- 6. Goal-linked notes (own goals only)
      OR (
        n.goal_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.goals g
          WHERE g.id = n.goal_id
          AND g.user_id = my_profile_id()
        )
      )

      -- 7. Collaborators visibility (project-scoped)
      OR (
        n.visibility = 'collaborators'
        AND n.project_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.projects pr
          WHERE pr.id = n.project_id
          AND my_profile_id() = ANY(pr.collaborator_ids)
        )
      )
    )
  );
$$;

ALTER FUNCTION public.can_view_note(uuid) OWNER TO postgres;

-- Phase 3: Replace applause SELECT policy only
DROP POLICY IF EXISTS "Users can view applause on visible notes" ON public.applause;

CREATE POLICY "Users can view applause on visible notes"
ON public.applause
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.can_view_note(note_id)
);