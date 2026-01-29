-- Add foreign key constraint for user_id to profiles table
ALTER TABLE public.applause
ADD CONSTRAINT applause_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;