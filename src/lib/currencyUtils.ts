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

export const PREMIUM_PRICES = {
  USD: { 
    amount: 3.49, 
    priceId: 'price_1Sr25PGiNcIsULtkCe7dqa1V',
    symbol: '$',
    label: '$3.49 USD'
  },
  CAD: { 
    amount: 4.99, 
    priceId: 'price_1Sr25dGiNcIsULtkcFRqzZi7',
    symbol: '$',
    label: '$4.99 CAD'
  }
} as const;

export function formatPrice(currency: SupportedCurrency): string {
  const price = PREMIUM_PRICES[currency];
  return `${price.symbol}${price.amount.toFixed(2)}/month`;
}
