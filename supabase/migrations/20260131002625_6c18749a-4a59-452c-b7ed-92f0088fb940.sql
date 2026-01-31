-- Add profile_image column to groups table for separate group avatar
ALTER TABLE public.groups 
ADD COLUMN profile_image text;

-- Add comment explaining the field
COMMENT ON COLUMN public.groups.profile_image IS 'Separate profile picture/avatar for the group, distinct from cover_image header';