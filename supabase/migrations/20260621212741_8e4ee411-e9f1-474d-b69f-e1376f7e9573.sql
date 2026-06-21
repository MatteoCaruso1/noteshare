
-- Grant Pro override to all current users with a note in the last 30 days
INSERT INTO public.premium_overrides (user_id, enabled, note)
SELECT DISTINCT p.user_id, true, 'Free Pro - active user (note in last 30 days) - 2026-06-21'
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.notes n
  WHERE n.author_id = p.id
    AND n.created_at > now() - interval '30 days'
)
ON CONFLICT (user_id) DO NOTHING;

-- Update handle_new_user trigger to also grant premium override to new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
  v_username text;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'user_' || substr(NEW.id::text, 1, 8)
  );

  INSERT INTO public.profiles (id, user_id, name, username, avatar)
  VALUES (
    NEW.id,
    NEW.id,
    v_name,
    v_username,
    'https://api.dicebear.com/9.x/shapes/svg?seed=' || NEW.id::text || '&backgroundColor=1e3a5a,1e40af,3b82f6&shape1Color=60a5fa,93c5fd,f8fafc&shape2Color=3b82f6,1e40af,60a5fa&shape3Color=93c5fd,bfdbfe,f8fafc'
  );

  -- Grant Pro free to all new users (Pro is currently free for everyone)
  INSERT INTO public.premium_overrides (user_id, enabled, note)
  VALUES (NEW.id, true, 'Free Pro - new signup (Pro free for everyone)')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;
