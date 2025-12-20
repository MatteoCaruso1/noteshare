-- Add current_streak column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN current_streak integer NOT NULL DEFAULT 0;