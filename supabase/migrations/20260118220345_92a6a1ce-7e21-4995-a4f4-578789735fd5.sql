-- Add premium_override column to profiles table for developer testing
ALTER TABLE public.profiles 
ADD COLUMN premium_override boolean NOT NULL DEFAULT false;

-- Add a comment explaining its purpose
COMMENT ON COLUMN public.profiles.premium_override IS 'Developer override to grant premium access without Stripe subscription';