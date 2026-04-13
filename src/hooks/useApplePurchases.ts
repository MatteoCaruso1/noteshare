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

  const pluginRef = useRef<any>(null);
  const isNativeIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  // Initialize the IAP plugin
  useEffect(() => {
    if (!isNativeIOS) return;

    let mounted = true;

    const init = async () => {
      try {
        const { NativePurchases } = await import('@capgo/native-purchases');
        pluginRef.current = NativePurchases;

        if (!mounted) return;

        setState(prev => ({ ...prev, isLoading: true }));

        // Fetch products
        const productIds = Object.values(APPLE_PRODUCT_IDS);
        const result = await NativePurchases.getProducts({
          productIds,
        });

        if (!mounted) return;

        const products: AppleProduct[] = (result.products || []).map((p: any) => ({
          id: p.id || p.productId,
          title: p.title || p.localizedTitle || p.displayName || '',
          description: p.description || p.localizedDescription || '',
          price: p.priceString || p.displayPrice || `${p.price}`,
          priceAmount: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
          currency: p.currencyCode || p.currency || 'USD',
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
    if (!pluginRef.current || !isNativeIOS) {
      setState(prev => ({ ...prev, error: 'Store not available' }));
      return false;
    }

    setState(prev => ({ ...prev, isPurchasing: true, error: null }));

    try {
      const { NativePurchases } = await import('@capgo/native-purchases');

      // Initiate the purchase — StoreKit handles the UI
      const result = await NativePurchases.purchaseProduct({
        productId,
      });

      if (!result || !result.transaction) {
        throw new Error('Purchase cancelled or failed');
      }

      const transaction = result.transaction;
      const transactionId = transaction.transactionId || transaction.originalTransactionId || transaction.id;

      // Verify with our backend
      const { data, error } = await supabase.functions.invoke('verify-apple-purchase', {
        body: {
          transaction_id: transactionId,
          product_id: productId,
          receipt_data: transaction.receiptData || transaction.appAccountToken,
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
    if (!pluginRef.current || !isNativeIOS) {
      setState(prev => ({ ...prev, error: 'Store not available' }));
      return false;
    }

    setState(prev => ({ ...prev, isRestoring: true, error: null }));

    try {
      const { NativePurchases } = await import('@capgo/native-purchases');

      const result = await NativePurchases.restorePurchases();
      const transactions = result?.transactions || [];

      if (transactions.length === 0) {
        setState(prev => ({ ...prev, isRestoring: false, error: 'No purchases to restore' }));
        return false;
      }

      let anyVerified = false;

      for (const transaction of transactions) {
        const transactionId = transaction.transactionId || transaction.originalTransactionId || transaction.id;
        const productId = transaction.productId || transaction.product_id;

        if (!transactionId || !productId) continue;

        // Only verify products we recognize
        if (!Object.values(APPLE_PRODUCT_IDS).includes(productId)) continue;

        try {
          const { data } = await supabase.functions.invoke('verify-apple-purchase', {
            body: {
              transaction_id: transactionId,
              product_id: productId,
              receipt_data: transaction.receiptData,
              jws_representation: transaction.jwsRepresentation,
            },
          });

          if (data?.verified) {
            anyVerified = true;
          }
        } catch {
          // Continue with other transactions
        }
      }

      setState(prev => ({
        ...prev,
        isRestoring: false,
        error: anyVerified ? null : 'No valid purchases found',
      }));

      return anyVerified;
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
