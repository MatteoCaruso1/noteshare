import { useState, useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

// Apple product IDs — must match App Store Connect configuration
export const APPLE_PRODUCT_IDS = {
  monthly: 'noteshare_pro_monthly',
  lifetime: 'noteshare_pro_lifetime',
} as const;

export interface AppleProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  currency: string;
}

interface ApplePurchaseState {
  isAvailable: boolean;
  products: AppleProduct[];
  isLoading: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  error: string | null;
}

/**
 * Hook for Apple In-App Purchases via Capacitor.
 * Only active on native iOS — returns no-op on web/Android.
 */
export function useApplePurchases() {
  const [state, setState] = useState<ApplePurchaseState>({
    isAvailable: false,
    products: [],
    isLoading: false,
    isPurchasing: false,
    isRestoring: false,
    error: null,
  });

  const isNativeIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  // Initialize the IAP plugin and fetch products
  useEffect(() => {
    if (!isNativeIOS) return;

    let mounted = true;

    const init = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));

        const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');

        if (!mounted) return;

        // Fetch subscription products
        const subsResult = await NativePurchases.getProducts({
          productIdentifiers: [APPLE_PRODUCT_IDS.monthly],
          productType: PURCHASE_TYPE.SUBS,
        });

        // Fetch one-time purchase products
        const iapResult = await NativePurchases.getProducts({
          productIdentifiers: [APPLE_PRODUCT_IDS.lifetime],
          productType: PURCHASE_TYPE.INAPP,
        });

        if (!mounted) return;

        const allProducts = [...(subsResult.products || []), ...(iapResult.products || [])];

        const products: AppleProduct[] = allProducts.map((p) => ({
          id: p.id || (p as any).productId,
          title: p.title || (p as any).localizedTitle || (p as any).displayName || '',
          description: p.description || (p as any).localizedDescription || '',
          price: p.priceString || (p as any).displayPrice || `${p.price}`,
          priceAmount: typeof p.price === 'number' ? p.price : parseFloat(String(p.price)) || 0,
          currency: p.currencyCode || (p as any).currency || 'USD',
        }));

        setState({
          isAvailable: true,
          products,
          isLoading: false,
          isPurchasing: false,
          isRestoring: false,
          error: null,
        });
      } catch (err) {
        console.error('[ApplePurchases] Init failed:', err);
        if (mounted) {
          setState(prev => ({
            ...prev,
            isAvailable: false,
            isLoading: false,
            error: 'Store not available',
          }));
        }
      }
    };

    init();
    return () => { mounted = false; };
  }, [isNativeIOS]);

  /**
   * Purchase a product and verify receipt server-side.
   */
  const purchaseProduct = useCallback(async (productId: string): Promise<boolean> => {
    if (!isNativeIOS) {
      setState(prev => ({ ...prev, error: 'Store not available' }));
      return false;
    }

    setState(prev => ({ ...prev, isPurchasing: true, error: null }));

    try {
      const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');

      const isSubscription = productId === APPLE_PRODUCT_IDS.monthly;

      // Initiate the purchase — StoreKit handles the UI
      const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: productId,
        productType: isSubscription ? PURCHASE_TYPE.SUBS : PURCHASE_TYPE.INAPP,
      });

      if (!transaction || !transaction.transactionId) {
        throw new Error('Purchase cancelled or failed');
      }

      // Verify with our backend
      const { data, error } = await supabase.functions.invoke('verify-apple-purchase', {
        body: {
          transaction_id: transaction.transactionId,
          product_id: productId,
          receipt_data: transaction.receipt,
          jws_representation: transaction.jwsRepresentation,
        },
      });

      if (error) throw error;
      if (!data?.verified) throw new Error(data?.error || 'Verification failed');

      setState(prev => ({ ...prev, isPurchasing: false }));
      return true;
    } catch (err: any) {
      const message = err?.message || 'Purchase failed';
      // User cancellation is not an error
      const isCancelled = message.includes('cancel') || message.includes('Cancel') || err?.code === 'USER_CANCELLED';

      setState(prev => ({
        ...prev,
        isPurchasing: false,
        error: isCancelled ? null : message,
      }));
      return false;
    }
  }, [isNativeIOS]);

  /**
   * Restore purchases — re-syncs past Apple transactions with our entitlements.
   */
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!isNativeIOS) {
      setState(prev => ({ ...prev, error: 'Store not available' }));
      return false;
    }

    setState(prev => ({ ...prev, isRestoring: true, error: null }));

    try {
      const { NativePurchases } = await import('@capgo/native-purchases');

      // restorePurchases returns void — it triggers the listener flow
      // For now, we call it and then do a subscription check
      await NativePurchases.restorePurchases();

      setState(prev => ({
        ...prev,
        isRestoring: false,
        error: null,
      }));

      // The caller should trigger a subscription recheck after this
      return true;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isRestoring: false,
        error: err?.message || 'Restore failed',
      }));
      return false;
    }
  }, [isNativeIOS]);

  return {
    ...state,
    isNativeIOS,
    purchaseProduct,
    restorePurchases,
  };
}
