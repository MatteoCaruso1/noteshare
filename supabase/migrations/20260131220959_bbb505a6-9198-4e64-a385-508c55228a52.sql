-- Add mute preferences to group_members
ALTER TABLE public.group_members 
ADD COLUMN mute_posts boolean NOT NULL DEFAULT false,
ADD COLUMN mute_events boolean NOT NULL DEFAULT false;

-- Create trigger function for group post notifications
CREATE OR REPLACE FUNCTION public.notify_group_members_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group_name TEXT;
  v_author_name TEXT;
  v_member RECORD;
BEGIN
  -- Get the group name
  SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;
  
  -- Get the author name
  SELECT name INTO v_author_name FROM public.profiles WHERE id = NEW.author_id;
  
  -- Insert notification for each active member except the author, respecting mute preference
  FOR v_member IN 
    SELECT gm.user_id 
    FROM public.group_members gm
    WHERE gm.group_id = NEW.group_id 
      AND gm.status = 'active'
      AND gm.user_id != NEW.author_id
      AND gm.mute_posts = false
  LOOP
    INSERT INTO public.notifications (user_id, from_user_id, type, content)
    VALUES (
      v_member.user_id,
      NEW.author_id,
      'group_post',
      v_author_name || ' posted in ' || v_group_name
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for group_posts
CREATE TRIGGER notify_on_group_post
AFTER INSERT ON public.group_posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_group_members_on_post();

-- Update the existing event notification function to respect mute_events preference
CREATE OR REPLACE FUNCTION public.notify_group_members_on_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group_name TEXT;
  v_event_name TEXT;
  v_member RECORD;
BEGIN
  -- Get the group name
  SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;
  v_event_name := NEW.name;
  
  -- Insert notification for each active member except the creator, respecting mute preference
  FOR v_member IN 
    SELECT gm.user_id 
    FROM public.group_members gm
    WHERE gm.group_id = NEW.group_id 
      AND gm.status = 'active'
      AND gm.user_id != NEW.created_by
      AND gm.mute_events = false
  LOOP
    INSERT INTO public.notifications (user_id, from_user_id, type, content)
    VALUES (
      v_member.user_id,
      NEW.created_by,
      'group_event',
      'New event "' || v_event_name || '" in ' || v_group_name
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;