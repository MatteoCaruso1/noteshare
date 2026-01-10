-- Add unique constraint on username to prevent duplicate handles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);