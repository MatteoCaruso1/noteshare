-- Create a table for group posts (similar to comments but for groups)
CREATE TABLE public.group_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_content TEXT,
  audio_files TEXT[] DEFAULT '{}'::text[],
  audio_file_names TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for group posts

-- Members can view posts in groups they belong to
CREATE POLICY "Members can view group posts"
  ON public.group_posts
  FOR SELECT
  USING (
    is_active_group_member(group_id) OR is_group_public(group_id)
  );

-- Members can create posts in groups they belong to
CREATE POLICY "Members can create group posts"
  ON public.group_posts
  FOR INSERT
  WITH CHECK (
    author_id = my_profile_id() AND is_active_group_member(group_id)
  );

-- Authors can update their own posts
CREATE POLICY "Authors can update their own group posts"
  ON public.group_posts
  FOR UPDATE
  USING (author_id = my_profile_id());

-- Authors can delete their own posts, admins can also delete any post
CREATE POLICY "Authors and admins can delete group posts"
  ON public.group_posts
  FOR DELETE
  USING (
    author_id = my_profile_id() OR is_group_admin(group_id)
  );

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_group_posts_updated_at
  BEFORE UPDATE ON public.group_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for efficient querying by group
CREATE INDEX idx_group_posts_group_id ON public.group_posts(group_id);
CREATE INDEX idx_group_posts_created_at ON public.group_posts(created_at DESC);