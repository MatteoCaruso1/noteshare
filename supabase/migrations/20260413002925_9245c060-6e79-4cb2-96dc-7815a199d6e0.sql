-- Add Apple IAP columns to user_entitlements
ALTER TABLE public.user_entitlements
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id text,
  ADD COLUMN IF NOT EXISTS apple_product_id text,
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- Add unique constraint on apple_original_transaction_id for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_entitlements_apple_txn
  ON public.user_entitlements (apple_original_transaction_id)
  WHERE apple_original_transaction_id IS NOT NULL;

-- Add index for provider-based lookups
CREATE INDEX IF NOT EXISTS idx_user_entitlements_provider
  ON public.user_entitlements (provider);
