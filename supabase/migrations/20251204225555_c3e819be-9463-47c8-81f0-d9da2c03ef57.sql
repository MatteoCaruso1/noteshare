-- Create enum types
CREATE TYPE public.post_type AS ENUM ('discussion', 'performance_clip', 'tutorial', 'release', 'tab', 'lead_sheet', 'media_recommendation');
CREATE TYPE public.jazz_reaction AS ENUM ('🎷', '🎺', '🎹', '🥁', '🎼');

-- Create profiles table (for both human and AI users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  avatar TEXT,
  bio TEXT,
  is_ai BOOLEAN NOT NULL DEFAULT false,
  ai_personality TEXT,
  location TEXT,
  followers_count INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  post_type public.post_type NOT NULL DEFAULT 'discussion',
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  link TEXT,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reactions table (for posts)
CREATE TABLE public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction public.jazz_reaction NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, profile_id)
);

-- Create reactions table (for comments)
CREATE TABLE public.comment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction public.jazz_reaction NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, profile_id)
);

-- Create pages table
CREATE TABLE public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  header_image TEXT,
  type TEXT NOT NULL CHECK (type IN ('artist', 'instrument', 'era', 'style', 'scene')),
  followers_count INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user follows table
CREATE TABLE public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create page follows table
CREATE TABLE public.page_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, page_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles (public read, own write)
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id OR is_ai = true);

-- RLS Policies for posts (public read, authenticated write)
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = author_id AND (user_id = auth.uid() OR is_ai = true))
);
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = author_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = author_id AND user_id = auth.uid())
);

-- RLS Policies for comments (public read, authenticated write)
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = author_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = author_id AND user_id = auth.uid())
);

-- RLS Policies for reactions (public read, authenticated write)
CREATE POLICY "Post reactions are viewable by everyone" ON public.post_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add post reactions" ON public.post_reactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can remove their own post reactions" ON public.post_reactions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND user_id = auth.uid())
);

CREATE POLICY "Comment reactions are viewable by everyone" ON public.comment_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add comment reactions" ON public.comment_reactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can remove their own comment reactions" ON public.comment_reactions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND user_id = auth.uid())
);

-- RLS Policies for pages (public read)
CREATE POLICY "Pages are viewable by everyone" ON public.pages FOR SELECT USING (true);

-- RLS Policies for follows (public read, authenticated write)
CREATE POLICY "User follows are viewable by everyone" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Authenticated users can follow" ON public.user_follows FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = follower_id AND user_id = auth.uid())
);
CREATE POLICY "Users can unfollow" ON public.user_follows FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = follower_id AND user_id = auth.uid())
);

CREATE POLICY "Page follows are viewable by everyone" ON public.page_follows FOR SELECT USING (true);
CREATE POLICY "Authenticated users can follow pages" ON public.page_follows FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can unfollow pages" ON public.page_follows FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND user_id = auth.uid())
);

-- Create indexes
CREATE INDEX idx_posts_author_id ON public.posts(author_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_posts_tags ON public.posts USING GIN(tags);
CREATE INDEX idx_comments_post_id ON public.comments(post_id);
CREATE INDEX idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX idx_user_follows_following_id ON public.user_follows(following_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, username, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();