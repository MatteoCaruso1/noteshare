
-- User entitlements table: source of truth for Pro access
CREATE TABLE public.user_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  is_pro BOOLEAN NOT NULL DEFAULT false,
  pro_type TEXT NOT NULL DEFAULT 'subscription', -- 'subscription' or 'lifetime'
  pro_activated_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Idempotent event processing table
CREATE TABLE public.stripe_processed_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orphan payments for manual reconciliation
CREATE TABLE public.orphan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT NOT NULL,
  stripe_customer_id TEXT,
  email TEXT,
  amount INTEGER,
  currency TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_user_id UUID
);

-- Purchase audit log
CREATE TABLE public.purchase_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT,
  stripe_customer_id TEXT,
  user_id UUID,
  checkout_session_id TEXT,
  payment_status TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  event_type TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS: all these tables are backend-only (service role access)
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_processed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orphan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_event_log ENABLE ROW LEVEL SECURITY;

-- No client access - service role only
CREATE POLICY "No client access" ON public.user_entitlements FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "No client access" ON public.stripe_processed_events FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "No client access" ON public.orphan_payments FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "No client access" ON public.purchase_event_log FOR ALL USING (false) WITH CHECK (false);
