
-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_item_type TEXT NOT NULL, -- 'comment' or 'group_post'
  reported_item_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  reason TEXT DEFAULT 'inappropriate',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports (authenticated)
CREATE POLICY "Users can create reports"
ON public.reports FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = reports.reporter_id
    AND profiles.user_id = auth.uid()
  )
);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = reports.reporter_id
    AND profiles.user_id = auth.uid()
  )
);

-- Admin (matteo) can view all reports
CREATE POLICY "Admin can view all reports"
ON public.reports FOR SELECT
USING (
  auth.uid() = (SELECT user_id FROM profiles WHERE id = '9d8991fb-b065-415c-90f1-96b418ae23a2')
);

-- Trigger to notify admin on new report
CREATE OR REPLACE FUNCTION public.notify_admin_on_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reporter_name TEXT;
  v_item_type TEXT;
BEGIN
  SELECT name INTO v_reporter_name FROM profiles WHERE id = NEW.reporter_id;
  v_item_type := NEW.reported_item_type;
  
  INSERT INTO public.notifications (user_id, from_user_id, type, content)
  VALUES (
    '9d8991fb-b065-415c-90f1-96b418ae23a2',
    NEW.reporter_id,
    'report',
    v_reporter_name || ' reported a ' || v_item_type || ' as ' || COALESCE(NEW.reason, 'inappropriate')
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_report_created
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_report();
