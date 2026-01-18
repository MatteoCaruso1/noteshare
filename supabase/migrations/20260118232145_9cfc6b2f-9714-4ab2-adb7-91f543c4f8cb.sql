-- Create page_views table for tracking user page visits
CREATE TABLE public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_name TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient aggregation queries
CREATE INDEX idx_page_views_viewed_at ON public.page_views(viewed_at);
CREATE INDEX idx_page_views_page_user_date ON public.page_views(page_name, user_id, viewed_at);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own page views
CREATE POLICY "Users can log their own page views" ON public.page_views
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = page_views.user_id AND profiles.user_id = auth.uid())
  );

-- Create admin_users table for admin access control
CREATE TABLE public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only allow reading admin_users to check admin status (no modifications via API)
CREATE POLICY "Users can check their own admin status" ON public.admin_users
  FOR SELECT USING (auth.uid() = user_id);