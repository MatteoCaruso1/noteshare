-- Add color_theme column to profiles table for Pro theme customization
ALTER TABLE public.profiles 
ADD COLUMN color_theme TEXT DEFAULT 'blue';