-- Create group_invites table for tracking invitations
CREATE TABLE public.group_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(group_id, invited_user_id)
);

-- Enable RLS
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Users can view invites sent to them or by them
CREATE POLICY "Users can view their own invites"
ON public.group_invites FOR SELECT
USING (
  invited_user_id = my_profile_id() OR 
  invited_by = my_profile_id() OR
  is_group_admin(group_id)
);

-- Admins can invite to private groups, anyone can invite to public groups
CREATE POLICY "Users can create invites"
ON public.group_invites FOR INSERT
WITH CHECK (
  invited_by = my_profile_id() AND (
    is_group_public(group_id) OR 
    is_group_admin(group_id)
  )
);

-- Invited users can respond to invites
CREATE POLICY "Invited users can respond"
ON public.group_invites FOR UPDATE
USING (invited_user_id = my_profile_id());

-- Inviters or admins can delete invites
CREATE POLICY "Inviters or admins can delete"
ON public.group_invites FOR DELETE
USING (
  invited_by = my_profile_id() OR
  is_group_admin(group_id)
);

-- Create helper function to check if user has been invited to a group
CREATE OR REPLACE FUNCTION public.has_group_invite(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_invites gi
    WHERE gi.group_id = p_group_id
      AND gi.invited_user_id = public.my_profile_id()
      AND gi.status = 'pending'
  );
$$;

-- Create helper function to check if user has a pending join request
CREATE OR REPLACE FUNCTION public.has_pending_join_request(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = public.my_profile_id()
      AND gm.status = 'pending'
  );
$$;

-- Update group_members INSERT policy to allow invited users to join private groups
DROP POLICY IF EXISTS "Users can join or request groups" ON public.group_members;

CREATE POLICY "Users can join or request groups"
ON public.group_members FOR INSERT
WITH CHECK (
  user_id = my_profile_id() AND (
    -- Public groups: join directly
    (is_group_public(group_id) AND status = 'active') OR
    -- Private groups with invite: join directly  
    (NOT is_group_public(group_id) AND status = 'active' AND has_group_invite(group_id)) OR
    -- Private groups without invite: request to join (pending)
    (NOT is_group_public(group_id) AND status = 'pending' AND NOT has_group_invite(group_id))
  )
);