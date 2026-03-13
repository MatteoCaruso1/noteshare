
CREATE TABLE public.onboarding_step_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  step_number integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_step_events_user_id_step_unique UNIQUE (user_id, step_number)
);

ALTER TABLE public.onboarding_step_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log their own onboarding steps"
  ON public.onboarding_step_events
  FOR INSERT
  TO public
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "No client read access"
  ON public.onboarding_step_events
  FOR SELECT
  TO public
  USING (false);
