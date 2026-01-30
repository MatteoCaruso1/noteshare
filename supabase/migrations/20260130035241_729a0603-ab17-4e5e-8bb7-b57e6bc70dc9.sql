-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  focus_type TEXT NOT NULL DEFAULT 'general', -- general, genre, instrument, venue, practice
  focus_details TEXT[], -- specific genres/instruments if applicable
  group_type TEXT[] NOT NULL DEFAULT '{}', -- casual, band, venue, educator, open-mic, etc
  privacy TEXT NOT NULL DEFAULT 'public', -- public or private
  location_type TEXT NOT NULL DEFAULT 'global', -- global or local
  city TEXT,
  member_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- admin, member
  status TEXT NOT NULL DEFAULT 'active', -- active, pending (for private groups)
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create group_events table for future use
CREATE TABLE public.group_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'jam', -- jam, open-mic, practice, gig, workshop
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  is_virtual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
CREATE POLICY "Anyone can view public groups"
ON public.groups FOR SELECT
USING (privacy = 'public');

CREATE POLICY "Members can view private groups"
ON public.groups FOR SELECT
USING (
  privacy = 'private' AND 
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = groups.id
    AND gm.status = 'active'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = gm.user_id AND p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create groups"
ON public.groups FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = groups.owner_id AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their groups"
ON public.groups FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = groups.owner_id AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can delete their groups"
ON public.groups FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = groups.owner_id AND profiles.user_id = auth.uid()
  )
);

-- RLS Policies for group_members
CREATE POLICY "Members can view group membership"
ON public.group_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = group_members.group_id
    AND (
      g.privacy = 'public'
      OR EXISTS (
        SELECT 1 FROM group_members gm2
        WHERE gm2.group_id = g.id
        AND gm2.status = 'active'
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = gm2.user_id AND p.user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can join public groups"
ON public.group_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = group_members.user_id AND profiles.user_id = auth.uid()
  )
  AND (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id AND g.privacy = 'public'
    )
    OR group_members.status = 'pending'
  )
);

CREATE POLICY "Users can leave groups"
ON public.group_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = group_members.user_id AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage members"
ON public.group_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    JOIN profiles p ON p.id = gm.user_id
    WHERE gm.group_id = group_members.group_id
    AND gm.role = 'admin'
    AND p.user_id = auth.uid()
  )
);

-- RLS Policies for group_events
CREATE POLICY "Members can view group events"
ON public.group_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_events.group_id
    AND gm.status = 'active'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = gm.user_id AND p.user_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = group_events.group_id AND g.privacy = 'public'
  )
);

CREATE POLICY "Admins can create events"
ON public.group_events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    JOIN profiles p ON p.id = gm.user_id
    WHERE gm.group_id = group_events.group_id
    AND gm.role = 'admin'
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update events"
ON public.group_events FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    JOIN profiles p ON p.id = gm.user_id
    WHERE gm.group_id = group_events.group_id
    AND gm.role = 'admin'
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can delete events"
ON public.group_events FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    JOIN profiles p ON p.id = gm.user_id
    WHERE gm.group_id = group_events.group_id
    AND gm.role = 'admin'
    AND p.user_id = auth.uid()
  )
);

-- Create trigger for updating member count
CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE groups SET member_count = member_count - 1 WHERE id = OLD.group_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active' THEN
    UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active' THEN
    UPDATE groups SET member_count = member_count - 1 WHERE id = NEW.group_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_group_member_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.group_members
FOR EACH ROW EXECUTE FUNCTION public.update_group_member_count();

-- Create indexes for performance
CREATE INDEX idx_groups_owner ON public.groups(owner_id);
CREATE INDEX idx_groups_privacy ON public.groups(privacy);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_group_events_group ON public.group_events(group_id);
CREATE INDEX idx_group_events_date ON public.group_events(event_date);