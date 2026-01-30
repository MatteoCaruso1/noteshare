-- Fix infinite recursion in RLS between public.groups and public.group_members
-- by using SECURITY DEFINER helper functions (bypass RLS) instead of cross-table policy queries.

-- 1) Helper: current user's profile id
CREATE OR REPLACE FUNCTION public.my_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

-- 2) Helper: group is public
CREATE OR REPLACE FUNCTION public.is_group_public(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = p_group_id
      AND g.privacy = 'public'
  );
$$;

-- 3) Helper: membership check (active)
CREATE OR REPLACE FUNCTION public.is_active_group_member(p_group_id uuid)
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
      AND gm.status = 'active'
  );
$$;

-- 4) Helper: admin check (active)
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id uuid)
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
      AND gm.status = 'active'
      AND gm.role = 'admin'
  );
$$;

-- =========================
-- groups policies (remove recursion)
-- =========================
DROP POLICY IF EXISTS "Anyone can view public groups" ON public.groups;
DROP POLICY IF EXISTS "Members can view private groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Owners can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Owners can delete their groups" ON public.groups;

-- Public groups are viewable by any authenticated user.
-- (If you want anonymous access later, we can extend this.)
CREATE POLICY "Authenticated can view public groups"
ON public.groups
FOR SELECT
TO authenticated
USING (privacy = 'public');

-- Private groups are viewable only to active members.
CREATE POLICY "Members can view private groups"
ON public.groups
FOR SELECT
TO authenticated
USING (privacy = 'private' AND public.is_active_group_member(id));

-- Create group only if owner_id matches the caller's profile id.
CREATE POLICY "Users can create groups"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (owner_id = public.my_profile_id());

-- Update/delete only if caller is the owner.
CREATE POLICY "Owners can update their groups"
ON public.groups
FOR UPDATE
TO authenticated
USING (owner_id = public.my_profile_id());

CREATE POLICY "Owners can delete their groups"
ON public.groups
FOR DELETE
TO authenticated
USING (owner_id = public.my_profile_id());

-- =========================
-- group_members policies (remove recursion)
-- =========================
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.group_members;
DROP POLICY IF EXISTS "Anyone can view public group memberships" ON public.group_members;
DROP POLICY IF EXISTS "Users can join public groups" ON public.group_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

-- View memberships:
-- - always allow a user to see their own rows
-- - allow members to see membership rows in their group (so member list works)
-- - allow anyone authenticated to see membership rows for public groups
CREATE POLICY "Users can view membership rows"
ON public.group_members
FOR SELECT
TO authenticated
USING (
  user_id = public.my_profile_id()
  OR public.is_group_public(group_id)
  OR public.is_active_group_member(group_id)
);

-- Insert membership:
-- - allow joining public groups as active
-- - allow requesting private groups as pending
-- - always require user_id = my_profile_id()
CREATE POLICY "Users can join or request groups"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = public.my_profile_id()
  AND (
    (public.is_group_public(group_id) AND status = 'active')
    OR (NOT public.is_group_public(group_id) AND status = 'pending')
  )
);

-- Update membership:
-- - only admins can manage members (approve/role changes)
-- - allow user to update their own row ONLY in a narrow way (optional later)
CREATE POLICY "Admins can manage members"
ON public.group_members
FOR UPDATE
TO authenticated
USING (public.is_group_admin(group_id));

-- Delete membership:
-- - user can leave (delete their row)
-- - admin can remove others
CREATE POLICY "Users can leave groups"
ON public.group_members
FOR DELETE
TO authenticated
USING (
  user_id = public.my_profile_id()
  OR public.is_group_admin(group_id)
);

-- =========================
-- Security linter: add at least one policy to premium_overrides (RLS enabled, no policies)
-- We lock it down entirely by default.
-- =========================
ALTER TABLE public.premium_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No access" ON public.premium_overrides;
CREATE POLICY "No access"
ON public.premium_overrides
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
