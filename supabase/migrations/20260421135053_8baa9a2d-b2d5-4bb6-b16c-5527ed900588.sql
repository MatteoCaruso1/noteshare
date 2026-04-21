-- Practice Plan Templates: structured "on rails" practice sessions
CREATE TABLE public.practice_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Practice Plan',
  -- Sections stored as ordered JSONB array
  -- Each item: { id, kind: 'section'|'break', title, minutes, color? }
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_practice_plans_user ON public.practice_plans(user_id, updated_at DESC);

ALTER TABLE public.practice_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own practice plans"
  ON public.practice_plans FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = practice_plans.user_id AND p.user_id = auth.uid()));

CREATE POLICY "Users can create their own practice plans"
  ON public.practice_plans FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = practice_plans.user_id AND p.user_id = auth.uid()));

CREATE POLICY "Users can update their own practice plans"
  ON public.practice_plans FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = practice_plans.user_id AND p.user_id = auth.uid()));

CREATE POLICY "Users can delete their own practice plans"
  ON public.practice_plans FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = practice_plans.user_id AND p.user_id = auth.uid()));

CREATE TRIGGER update_practice_plans_updated_at
  BEFORE UPDATE ON public.practice_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();