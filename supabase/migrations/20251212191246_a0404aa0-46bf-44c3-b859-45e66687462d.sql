-- First drop the dependent policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Drop existing tables (clean slate)
DROP TABLE IF EXISTS comment_reactions CASCADE;
DROP TABLE IF EXISTS post_reactions CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS page_follows CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS user_follows CASCADE;
DROP TABLE IF EXISTS moderation_flags CASCADE;

-- Drop old enums
DROP TYPE IF EXISTS jazz_reaction CASCADE;
DROP TYPE IF EXISTS post_type CASCADE;
DROP TYPE IF EXISTS moderation_status CASCADE;

-- Update profiles table for Noteshare
ALTER TABLE profiles DROP COLUMN IF EXISTS ai_personality;
ALTER TABLE profiles DROP COLUMN IF EXISTS persona_profile;
ALTER TABLE profiles DROP COLUMN IF EXISTS is_ai;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instruments text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS genres text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skill_level text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS open_to_collaborate boolean DEFAULT false;

-- Recreate the profile insert policy without is_ai
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Delete AI profiles (those without user_id)
DELETE FROM profiles WHERE user_id IS NULL;

-- Create practice_sessions table
CREATE TABLE public.practice_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  goals text,
  notes_summary text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON public.practice_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = practice_sessions.user_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Users can create their own sessions" ON public.practice_sessions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = practice_sessions.user_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Users can update their own sessions" ON public.practice_sessions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = practice_sessions.user_id AND profiles.user_id = auth.uid())
);

-- Create projects table
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_image text,
  tags text[] DEFAULT '{}',
  collaborator_ids uuid[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects or collaborations" ON public.projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = projects.owner_id AND profiles.user_id = auth.uid())
  OR auth.uid()::text = ANY(
    SELECT p.user_id::text FROM profiles p WHERE p.id = ANY(projects.collaborator_ids)
  )
);

CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = projects.owner_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Owners can update their projects" ON public.projects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = projects.owner_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Owners can delete their projects" ON public.projects FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = projects.owner_id AND profiles.user_id = auth.uid())
);

-- Create notes table
CREATE TABLE public.notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id uuid REFERENCES practice_sessions(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  text_content text,
  audio_files text[] DEFAULT '{}',
  image_files text[] DEFAULT '{}',
  video_files text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'collaborators', 'followers', 'public')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes" ON public.notes FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = notes.author_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Users can view shared notes" ON public.notes FOR SELECT USING (
  visibility = 'public'
  OR (visibility = 'collaborators' AND notes.project_id IN (
    SELECT id FROM projects WHERE auth.uid()::text = ANY(
      SELECT p.user_id::text FROM profiles p WHERE p.id = ANY(projects.collaborator_ids)
    )
  ))
);

CREATE POLICY "Users can create notes" ON public.notes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = notes.author_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = notes.author_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = notes.author_id AND profiles.user_id = auth.uid())
);

-- Create note_comments table
CREATE TABLE public.note_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.note_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on visible notes" ON public.note_comments FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON public.note_comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = note_comments.author_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Users can delete their own comments" ON public.note_comments FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = note_comments.author_id AND profiles.user_id = auth.uid())
);

-- Create promo_posts table (gigs, releases, events)
CREATE TYPE promo_type AS ENUM ('gig', 'release', 'event');

CREATE TABLE public.promo_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  promo_type promo_type NOT NULL,
  title text NOT NULL,
  description text,
  event_date timestamp with time zone,
  image text,
  links text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promo posts are viewable by everyone" ON public.promo_posts FOR SELECT USING (true);

CREATE POLICY "Users can create promo posts" ON public.promo_posts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = promo_posts.author_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Users can update their own promo posts" ON public.promo_posts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = promo_posts.author_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Users can delete their own promo posts" ON public.promo_posts FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = promo_posts.author_id AND profiles.user_id = auth.uid())
);

-- Create followers table (private model)
CREATE TABLE public.followers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  approved boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follow relationships" ON public.followers FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = followers.follower_id AND profiles.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = followers.following_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Users can follow others" ON public.followers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = followers.follower_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Users can unfollow" ON public.followers FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = followers.follower_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Users can approve followers" ON public.followers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = followers.following_id AND profiles.user_id = auth.uid())
);

-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public) VALUES ('practice-media', 'practice-media', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'practice-media' AND auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view media" ON storage.objects FOR SELECT USING (bucket_id = 'practice-media');

CREATE POLICY "Users can delete their own media" ON storage.objects FOR DELETE USING (
  bucket_id = 'practice-media' AND auth.uid()::text = (storage.foldername(name))[1]
);