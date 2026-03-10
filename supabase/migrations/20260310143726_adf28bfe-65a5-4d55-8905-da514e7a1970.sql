
-- Add group_id column to notifications table
ALTER TABLE public.notifications ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;

-- Update the notify_group_members_on_post trigger function to store group_id
CREATE OR REPLACE FUNCTION public.notify_group_members_on_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_group_name TEXT;
  v_author_name TEXT;
  v_member RECORD;
BEGIN
  SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;
  SELECT name INTO v_author_name FROM public.profiles WHERE id = NEW.author_id;
  
  FOR v_member IN 
    SELECT gm.user_id 
    FROM public.group_members gm
    WHERE gm.group_id = NEW.group_id 
      AND gm.status = 'active'
      AND gm.user_id != NEW.author_id
      AND gm.mute_posts = false
  LOOP
    INSERT INTO public.notifications (user_id, from_user_id, type, content, group_id)
    VALUES (
      v_member.user_id,
      NEW.author_id,
      'group_post',
      v_author_name || ' posted in ' || v_group_name,
      NEW.group_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Also update notify_group_members_on_event to store group_id
CREATE OR REPLACE FUNCTION public.notify_group_members_on_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_group_name TEXT;
  v_event_name TEXT;
  v_member RECORD;
BEGIN
  SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;
  v_event_name := NEW.name;
  
  FOR v_member IN 
    SELECT gm.user_id 
    FROM public.group_members gm
    WHERE gm.group_id = NEW.group_id 
      AND gm.status = 'active'
      AND gm.user_id != NEW.created_by
      AND gm.mute_events = false
  LOOP
    INSERT INTO public.notifications (user_id, from_user_id, type, content, group_id)
    VALUES (
      v_member.user_id,
      NEW.created_by,
      'group_event',
      'New event "' || v_event_name || '" in ' || v_group_name,
      NEW.group_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;
