-- Update the handle_new_user trigger function to use a branded Noteshare avatar style
-- Using DiceBear's "lorelei-neutral" style with Noteshare brand colors (blue-toned)

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
  -- Use provided name or fallback to email prefix
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  
  -- Use provided username or generate one
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'user_' || substr(NEW.id::text, 1, 8)
  );

  INSERT INTO public.profiles (
    id,
    user_id,
    name,
    username,
    avatar
  ) VALUES (
    NEW.id,
    NEW.id,
    v_name,
    v_username,
    -- Use DiceBear lorelei-neutral with Noteshare brand blue colors
    -- backgroundColor options cycle through brand palette, skin uses blue tones
    'https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=' || NEW.id::text || '&backgroundColor=3b82f6,60a5fa,1e40af,1e3a5a,f8fafc&skinColor=93c5fd,bfdbfe'
  );
  RETURN NEW;
END;
$$;