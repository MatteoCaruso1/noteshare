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

// New pricing: $2.49 CAD/month subscription, $9.99 CAD lifetime
export const PREMIUM_PRICES = {
  subscription: {
    amount: 2.49,
    priceId: 'price_1Sw8ilGiNcIsULtkGOJKoXdT',
    currency: 'CAD',
    symbol: '$',
    label: '$2.49/mo'
  },
  lifetime: {
    amount: 9.99,
    priceId: 'price_1Sw8hBGiNcIsULtkxrZRuf6O',
    currency: 'CAD',
    symbol: '$',
    label: '$9.99'
  }
} as const;

export const TRIAL_DAYS = 7;

export function formatSubscriptionPrice(): string {
  return `${PREMIUM_PRICES.subscription.symbol}${PREMIUM_PRICES.subscription.amount.toFixed(2)}/mo`;
}

export function formatLifetimePrice(): string {
  return `${PREMIUM_PRICES.lifetime.symbol}${PREMIUM_PRICES.lifetime.amount.toFixed(2)}`;
}

// Legacy function for backwards compatibility
export function formatPrice(currency: SupportedCurrency): string {
  return formatSubscriptionPrice();
}
