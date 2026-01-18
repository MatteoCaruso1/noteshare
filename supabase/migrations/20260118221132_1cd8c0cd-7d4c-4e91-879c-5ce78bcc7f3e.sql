-- Create dedicated premium_overrides table (not on profiles)
CREATE TABLE public.premium_overrides (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS with NO policies (only backend can access)
ALTER TABLE public.premium_overrides ENABLE ROW LEVEL SECURITY;

-- Add trigger for updated_at
CREATE TRIGGER update_premium_overrides_updated_at
  BEFORE UPDATE ON public.premium_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert override for Matteo only
INSERT INTO public.premium_overrides (user_id, enabled, note)
VALUES ('72d4f978-a781-485c-94b0-75dd30d0215e', true, 'Matteo - developer testing');

-- Clear any profile-based overrides to avoid confusion
UPDATE public.profiles SET premium_override = false WHERE premium_override = true;