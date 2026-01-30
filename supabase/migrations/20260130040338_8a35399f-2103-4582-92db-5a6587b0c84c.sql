-- Drop existing problematic policies on group_members
DROP POLICY IF EXISTS "Members can view group membership" ON public.group_members;
DROP POLICY IF EXISTS "Users can join public groups" ON public.group_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

-- Recreate with non-recursive policies

-- Users can view their own memberships
CREATE POLICY "Users can view their own memberships"
  ON public.group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = group_members.user_id AND p.user_id = auth.uid()
    )
  );

-- Users can view memberships of public groups (simplified - no recursion)
CREATE POLICY "Anyone can view public group memberships"
  ON public.group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id AND g.privacy = 'public'
    )
  );

-- Users can join public groups (simplified)
CREATE POLICY "Users can join public groups"
  ON public.group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = group_members.user_id AND p.user_id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM groups g
        WHERE g.id = group_members.group_id AND g.privacy = 'public'
      )
      OR group_members.status = 'pending'
    )
  );

-- Admins can manage members (avoid recursion by using direct auth.uid check)
CREATE POLICY "Admins can manage members"
  ON public.group_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      JOIN profiles p ON p.id = gm.user_id
      WHERE gm.group_id = group_members.group_id
        AND gm.role = 'admin'
        AND gm.status = 'active'
        AND p.user_id = auth.uid()
        AND gm.id != group_members.id  -- Prevent self-reference
    )
  );

-- Users can leave groups  
CREATE POLICY "Users can leave groups"
  ON public.group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = group_members.user_id AND p.user_id = auth.uid()
    )
  );