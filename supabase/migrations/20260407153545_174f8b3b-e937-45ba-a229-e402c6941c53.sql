
CREATE TABLE public.custom_chart_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Chart',
  chart_type TEXT NOT NULL DEFAULT 'line',
  metric TEXT NOT NULL DEFAULT 'practice_minutes',
  time_granularity TEXT NOT NULL DEFAULT 'weekly',
  time_range TEXT NOT NULL DEFAULT '3m',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_chart_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chart views"
  ON public.custom_chart_views FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = custom_chart_views.user_id AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own chart views"
  ON public.custom_chart_views FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = custom_chart_views.user_id AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own chart views"
  ON public.custom_chart_views FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = custom_chart_views.user_id AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own chart views"
  ON public.custom_chart_views FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = custom_chart_views.user_id AND profiles.user_id = auth.uid()
  ));

CREATE TRIGGER update_custom_chart_views_updated_at
  BEFORE UPDATE ON public.custom_chart_views
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
