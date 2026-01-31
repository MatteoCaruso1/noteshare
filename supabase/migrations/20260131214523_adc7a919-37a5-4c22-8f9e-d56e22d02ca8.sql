-- Create a function to notify group members when an event is created
CREATE OR REPLACE FUNCTION public.notify_group_members_on_event()
RETURNS TRIGGER
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
  
  -- Insert notification for each active member except the creator
  FOR v_member IN 
    SELECT gm.user_id 
    FROM public.group_members gm
    WHERE gm.group_id = NEW.group_id 
      AND gm.status = 'active'
      AND gm.user_id != NEW.created_by
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

-- Create trigger to fire after a new event is inserted
CREATE TRIGGER on_group_event_created
  AFTER INSERT ON public.group_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_group_members_on_event();