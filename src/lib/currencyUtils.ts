// Currency detection based on browser locale
// Falls back to USD for non-Canadian users

export type SupportedCurrency = 'CAD' | 'USD';

export function detectUserCurrency(): SupportedCurrency {
  // Always use CAD - USD pricing not available
  return 'CAD';
}

// Pricing by currency: $2.99/month subscription, $14.99 lifetime
export const PREMIUM_PRICES = {
  CAD: {
    subscription: {
      amount: 2.99,
      priceId: 'price_1THkXOGiNcIsULtkoVlM0NYp',
      currency: 'CAD',
      symbol: '$',
      label: '$2.99 CAD/mo'
    },
    lifetime: {
      amount: 14.99,
      priceId: 'price_1THkZ8GiNcIsULtkEhfGUmek',
      currency: 'CAD',
      symbol: '$',
      label: '$14.99 CAD'
    }
  },
  USD: {
    subscription: {
      amount: 2.99,
      priceId: 'price_1THkXOGiNcIsULtkoVlM0NYp',
      currency: 'USD',
      symbol: '$',
      label: '$2.99 USD/mo'
    },
    lifetime: {
      amount: 14.99,
      priceId: 'price_1THkZ8GiNcIsULtkEhfGUmek',
      currency: 'USD',
      symbol: '$',
      label: '$14.99 USD'
    }
  }
} as const;

export const TRIAL_DAYS = 7;

export function getPrices(currency: SupportedCurrency) {
  return PREMIUM_PRICES[currency];
}

export function formatSubscriptionPrice(currency: SupportedCurrency = 'CAD'): string {
  const prices = getPrices(currency);
  return prices.subscription.label;
}

export function formatLifetimePrice(currency: SupportedCurrency = 'CAD'): string {
  const prices = getPrices(currency);
  return prices.lifetime.label;
}

// Legacy function for backwards compatibility
export function formatPrice(currency: SupportedCurrency): string {
  return formatSubscriptionPrice(currency);
}
