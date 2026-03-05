

## Problem

Stuart Picton paid for lifetime but has no premium access. His Stripe customer exists but the payment intent is orphaned (not linked to the customer). This is the same bug that affected Aleks. The `check-subscription` edge function can't find the payment because it searches by customer ID.

## Immediate Fix

1. **Grant Stuart a premium override** via database insert into `premium_overrides` with `user_id` = Stuart's auth user ID, `enabled = true`, `note = 'Lifetime payment orphaned - paid via Stripe'`.

## Systemic Fix: Prevent Future Orphan Payments

The root cause is that the `create-lifetime-checkout` function sometimes creates a checkout session without properly attaching the customer. The recent code changes should prevent this going forward, but we should also add a **fallback payment intent search** in `check-subscription` that scans recent payment intents by email (not just by customer ID) to catch any remaining orphans.

### Changes to `check-subscription/index.ts`

Currently the function:
1. Finds customer by email
2. Falls back to metadata search
3. Checks payment intents on that customer

**Add step 4**: If no customer found OR customer has no lifetime payment, do a broader search of checkout sessions by `customer_details.email` to catch orphan payments. If found, link the payment to the customer for future lookups.

### Changes to `create-lifetime-checkout/index.ts`

Verify the existing fix ensures `customer` is always set on the checkout session (not just `customer_email`). Add a guard that refuses to create a session without a valid `customer` ID.

## Summary

- Insert premium override for Stuart (immediate)
- Harden `check-subscription` to detect orphan lifetime payments by email
- Harden `create-lifetime-checkout` to guarantee customer linkage

