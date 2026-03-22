// Edge function response types

export interface CheckSubscriptionResponse {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
  is_lifetime: boolean;
}

export interface CreateCheckoutEmbeddedResponse {
  clientSecret: string;
  sessionId: string;
  trialEndDate: string | null;
  trialOffered: boolean;
}
