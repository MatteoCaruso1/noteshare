// Currency detection based on user's timezone
// Falls back to USD for non-Canadian users

export type SupportedCurrency = 'CAD' | 'USD';

const CANADIAN_TIMEZONES = [
  'America/Toronto',
  'America/Vancouver', 
  'America/Edmonton',
  'America/Winnipeg',
  'America/Halifax',
  'America/St_Johns',
  'America/Regina',
  'America/Montreal',
  'America/Moncton',
  'America/Yellowknife',
  'America/Whitehorse',
  'America/Iqaluit',
];

export function detectUserCurrency(): SupportedCurrency {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    if (CANADIAN_TIMEZONES.some(tz => timezone.includes(tz) || tz.includes(timezone))) {
      return 'CAD';
    }
  } catch (e) {
    // Fallback if Intl API not available
    console.warn('Could not detect timezone, defaulting to USD');
  }
  
  return 'USD';
}

// Pricing by currency: $1.99/month subscription, $9.99 lifetime
export const PREMIUM_PRICES = {
  CAD: {
    subscription: {
      amount: 1.99,
      priceId: 'price_1SwECHGiNcIsULtk8vfidptO',
      currency: 'CAD',
      symbol: '$',
      label: '$1.99 CAD/mo'
    },
    lifetime: {
      amount: 9.99,
      priceId: 'price_1Sw8hBGiNcIsULtkxrZRuf6O',
      currency: 'CAD',
      symbol: '$',
      label: '$9.99 CAD'
    }
  },
  USD: {
    subscription: {
      amount: 1.99,
      priceId: 'price_1SwEHEGiNcIsULtkXsU7dXl7',
      currency: 'USD',
      symbol: '$',
      label: '$1.99 USD/mo'
    },
    lifetime: {
      amount: 9.99,
      priceId: 'price_1SwEHaGiNcIsULtkrQuVwm7M',
      currency: 'USD',
      symbol: '$',
      label: '$9.99 USD'
    }
  }
} as const;

export const TRIAL_DAYS = 7;

export function getPrices(currency: SupportedCurrency) {
  return PREMIUM_PRICES[currency];
}

export function formatSubscriptionPrice(currency: SupportedCurrency = 'USD'): string {
  const prices = getPrices(currency);
  return prices.subscription.label;
}

export function formatLifetimePrice(currency: SupportedCurrency = 'USD'): string {
  const prices = getPrices(currency);
  return prices.lifetime.label;
}

// Legacy function for backwards compatibility
export function formatPrice(currency: SupportedCurrency): string {
  return formatSubscriptionPrice(currency);
}
