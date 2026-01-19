-- First add a unique constraint on profiles.user_id so it can be referenced as a FK
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Drop the incorrect foreign key 
ALTER TABLE public.page_views 
  DROP CONSTRAINT IF EXISTS page_views_user_id_fkey;

-- Delete orphaned page_views records that don't have a matching profile
DELETE FROM public.page_views 
WHERE user_id NOT IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL);

-- Add the correct foreign key referencing profiles.user_id (auth user ID)
ALTER TABLE public.page_views 
  ADD CONSTRAINT page_views_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;