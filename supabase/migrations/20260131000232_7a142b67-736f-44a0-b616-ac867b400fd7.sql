-- Update RLS policy for groups to allow viewing private groups if user has an invite
DROP POLICY IF EXISTS "Members can view private groups " ON public.groups;

CREATE POLICY "Members or invited users can view private groups"
ON public.groups
FOR SELECT
USING (
  (privacy = 'private') 
  AND (
    is_active_group_member(id) 
    OR has_group_invite(id)
    OR has_pending_join_request(id)
  )
);