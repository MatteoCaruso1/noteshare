-- Update the handle_new_user trigger function to use a cleaner, more icon-like avatar style
-- Using DiceBear's "bottts-neutral" style which is geometric and icon-like with Noteshare brand colors

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_username text;
  v_name text;
BEGIN
  -- Generate username from email or metadata
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'user_' || substr(NEW.id::text, 1, 10)
  );
  
  -- Generate name from metadata or email
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, user_id, name, username, avatar)
  VALUES (
    NEW.id,
    NEW.id,
    v_name,
    v_username,
    -- Use DiceBear bottts-neutral for clean, geometric icon-like avatars
    -- Using Noteshare brand blue colors for consistency
    'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=' || NEW.id::text || '&backgroundColor=3b82f6,60a5fa,1e40af,1e3a5a'
  );
  RETURN NEW;
END;
$$;