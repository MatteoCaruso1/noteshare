
-- 1. Create push_tokens table
CREATE TABLE public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'ios',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_tokens_user_id ON public.push_tokens (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tokens"
  ON public.push_tokens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = push_tokens.user_id AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can register their own tokens"
  ON public.push_tokens FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = push_tokens.user_id AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own tokens"
  ON public.push_tokens FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = push_tokens.user_id AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own tokens"
  ON public.push_tokens FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = push_tokens.user_id AND profiles.user_id = auth.uid()
  ));

-- 2. Add sent_at to existing notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone DEFAULT NULL;

-- 3. Add composite index for efficient notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

-- 4. Create applause notification trigger
CREATE OR REPLACE FUNCTION public.notify_on_applause()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_note_author_id uuid;
  v_actor_name text;
BEGIN
  -- Get note author
  SELECT author_id INTO v_note_author_id
  FROM public.notes
  WHERE id = NEW.note_id;

  -- Skip self-applause
  IF v_note_author_id IS NULL OR v_note_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Deduplicate: skip if same actor+note notification exists within last hour
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE from_user_id = NEW.user_id
      AND note_id = NEW.note_id
      AND type = 'applause'
      AND created_at > now() - interval '1 hour'
  ) THEN
    RETURN NEW;
  END IF;

  -- Get actor name for content
  SELECT name INTO v_actor_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, from_user_id, note_id, type, content)
  VALUES (
    v_note_author_id,
    NEW.user_id,
    NEW.note_id,
    'applause',
    'gave you applause on your note'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_applause
  AFTER INSERT ON public.applause
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_applause();
