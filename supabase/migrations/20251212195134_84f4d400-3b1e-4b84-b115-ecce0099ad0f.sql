-- Add show_on_feed column to projects table
ALTER TABLE public.projects ADD COLUMN show_on_feed boolean NOT NULL DEFAULT false;

-- Add show_on_feed and is_paid_opportunity columns to promo_posts table
ALTER TABLE public.promo_posts ADD COLUMN show_on_feed boolean NOT NULL DEFAULT false;
ALTER TABLE public.promo_posts ADD COLUMN is_paid_opportunity boolean NOT NULL DEFAULT false;

-- Add RLS policy to allow viewing projects from friends (users you follow who follow you back)
CREATE POLICY "Users can view friends projects" 
ON public.projects 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM followers f1
    JOIN followers f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
    JOIN profiles p ON p.id = f1.follower_id
    WHERE f1.following_id = projects.owner_id
    AND p.user_id = auth.uid()
    AND f1.approved = true
    AND f2.approved = true
  )
);

-- Add RLS policy to allow viewing friends' promo posts
CREATE POLICY "Users can view friends promo posts" 
ON public.promo_posts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM followers f1
    JOIN followers f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
    JOIN profiles p ON p.id = f1.follower_id
    WHERE f1.following_id = promo_posts.author_id
    AND p.user_id = auth.uid()
    AND f1.approved = true
    AND f2.approved = true
  )
);