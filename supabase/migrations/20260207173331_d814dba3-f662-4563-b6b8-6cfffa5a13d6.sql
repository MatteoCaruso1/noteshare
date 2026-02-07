-- Update the handle_new_user trigger function to use abstract geometric avatars
-- Using DiceBear's "shapes" style which creates friendly, colorful geometric patterns
-- No gender or race implications - purely abstract shapes with Noteshare brand colors

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_username text;
BEGIN
  -- Get name from metadata or derive from email
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Get username from metadata or generate from user id
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
    -- Use DiceBear shapes for abstract, geometric avatars
    -- Primary colors: Noteshare blues and accent colors
    -- shape1Color, shape2Color, shape3Color use brand palette
    'https://api.dicebear.com/9.x/shapes/svg?seed=' || NEW.id::text || '&backgroundColor=1e3a5a,1e40af,3b82f6&shape1Color=60a5fa,93c5fd,f8fafc&shape2Color=3b82f6,1e40af,60a5fa&shape3Color=93c5fd,bfdbfe,f8fafc'
  );
  RETURN NEW;
END;
$$;