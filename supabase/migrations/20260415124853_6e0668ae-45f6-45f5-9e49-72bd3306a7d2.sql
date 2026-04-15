
CREATE TABLE public.routine_generations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  generated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.routine_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generations"
  ON public.routine_generations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = routine_generations.user_id AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own generations"
  ON public.routine_generations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = routine_generations.user_id AND profiles.user_id = auth.uid()
  ));

CREATE INDEX idx_routine_generations_user_date ON public.routine_generations (user_id, generated_at);
