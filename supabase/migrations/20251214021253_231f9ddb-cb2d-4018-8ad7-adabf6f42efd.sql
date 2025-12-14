-- Add expected release date to projects
ALTER TABLE public.projects 
ADD COLUMN release_date date DEFAULT NULL;