-- Chord progression game high scores
CREATE TABLE public.chord_game_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'advanced')),
  high_score INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, difficulty)
);

ALTER TABLE public.chord_game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own chord scores"
ON public.chord_game_scores FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own chord scores"
ON public.chord_game_scores FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own chord scores"
ON public.chord_game_scores FOR UPDATE
USING (auth.uid() = user_id);

CREATE INDEX idx_chord_game_scores_user ON public.chord_game_scores(user_id);