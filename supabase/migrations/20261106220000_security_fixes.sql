-- Security fixes from the November 2026 audit.

-- 1. Friendships: a request always starts as 'pending', and nobody can change who a
--    friendship is between. Before this, any user could insert an 'accepted'
--    friendship with anyone (and the addressee could rewrite requester_id), which
--    opened friends-only notes, projects, sessions and practice media.
DROP POLICY IF EXISTS "Users can create friendship requests" ON public.friendships;
CREATE POLICY "Users can create friendship requests"
ON public.friendships
FOR INSERT
WITH CHECK (
  status = 'pending'
  AND requester_id <> addressee_id
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = friendships.requester_id AND profiles.user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.friendships_keep_parties()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.addressee_id IS DISTINCT FROM OLD.addressee_id THEN
    RAISE EXCEPTION 'The people in a friendship cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friendships_keep_parties ON public.friendships;
CREATE TRIGGER friendships_keep_parties
BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.friendships_keep_parties();

-- 2. Group members: joining makes you a 'member'. Only the group's owner can add
--    themselves as 'admin' (the create-group flow does this).
DROP POLICY IF EXISTS "Users can join or request groups" ON public.group_members;
CREATE POLICY "Users can join or request groups"
ON public.group_members FOR INSERT
WITH CHECK (
  user_id = my_profile_id() AND (
    -- The owner adds themselves (any role) when creating the group
    (status = 'active' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = my_profile_id()))
    OR (
      role = 'member' AND (
        -- Public groups: join directly
        (is_group_public(group_id) AND status = 'active') OR
        -- Private groups with invite: join directly
        (NOT is_group_public(group_id) AND status = 'active' AND has_group_invite(group_id)) OR
        -- Private groups without invite: request to join (pending)
        (NOT is_group_public(group_id) AND status = 'pending' AND NOT has_group_invite(group_id))
      )
    )
  )
);

-- 3. Group invites: the invited person can accept or decline, but cannot repoint
--    the invite at another group or change who sent or received it.
CREATE OR REPLACE FUNCTION public.group_invites_keep_target()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.group_id IS DISTINCT FROM OLD.group_id
     OR NEW.invited_by IS DISTINCT FROM OLD.invited_by
     OR NEW.invited_user_id IS DISTINCT FROM OLD.invited_user_id THEN
    RAISE EXCEPTION 'An invite''s group and people cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS group_invites_keep_target ON public.group_invites;
CREATE TRIGGER group_invites_keep_target
BEFORE UPDATE ON public.group_invites
FOR EACH ROW EXECUTE FUNCTION public.group_invites_keep_target();

-- 4. admin_note_counts counted every user's notes (private ones too) for anyone who
--    called it. It now answers only for admins.
CREATE OR REPLACE FUNCTION public.admin_note_counts(p_profile_ids uuid[])
RETURNS TABLE(profile_id uuid, note_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT author_id AS profile_id, count(*) AS note_count
  FROM public.notes
  WHERE author_id = ANY(p_profile_ids)
    AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid())
  GROUP BY author_id;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_note_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_note_counts(uuid[]) TO authenticated;
