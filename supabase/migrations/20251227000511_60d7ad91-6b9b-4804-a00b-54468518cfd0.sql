-- Fix handle_new_user() with input validation for name and username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_username TEXT;
BEGIN
  -- Extract and validate name
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_name := TRIM(v_name);
  IF LENGTH(v_name) > 100 THEN
    v_name := SUBSTRING(v_name, 1, 100);
  END IF;
  IF LENGTH(v_name) = 0 THEN
    v_name := 'User';
  END IF;
  
  -- Extract and validate username
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8));
  v_username := TRIM(v_username);
  -- Remove non-alphanumeric characters except underscore and hyphen
  v_username := REGEXP_REPLACE(v_username, '[^a-zA-Z0-9_-]', '', 'g');
  IF LENGTH(v_username) > 50 THEN
    v_username := SUBSTRING(v_username, 1, 50);
  END IF;
  IF LENGTH(v_username) = 0 THEN
    v_username := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;
  
  INSERT INTO public.profiles (user_id, name, username, avatar)
  VALUES (
    NEW.id,
    v_name,
    v_username,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix update_updated_at_column() with search_path set
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;