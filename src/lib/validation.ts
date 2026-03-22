import { z } from 'zod';

// check-subscription edge function response
export const CheckSubscriptionSchema = z.object({
  subscribed: z.boolean(),
  product_id: z.string().nullable(),
  subscription_end: z.string().nullable(),
  is_lifetime: z.boolean(),
});

// get-analytics edge function response (top-level structure only)
export const GetAnalyticsSchema = z.object({
  noteActivatedUsers: z.object({ dailyCounts: z.array(z.any()), rollingAverage7d: z.array(z.any()), users: z.array(z.any()) }),
  noteActivationRate: z.object({ dailyRates: z.array(z.any()) }),
  day7Retention: z.object({ dailyRates: z.array(z.any()), today: z.object({ cohortSize: z.number(), retained: z.number(), rate: z.number().nullable() }) }),
  paidConversion: z.object({ totalActive: z.number(), inTrial: z.number(), actuallyPaying: z.number() }),
  trialToPaidRate: z.object({ trialsEndedLast7Days: z.number(), converted: z.number(), rate: z.number() }),
  premiumUsers: z.array(z.any()),
  friendCountUsers: z.array(z.any()),
  tryProClickUsers: z.array(z.any()),
  mobileSessionUsers: z.array(z.any()),
  accountFunnel: z.object({ accountsCreated: z.number(), with1PlusNotes: z.number(), with5PlusNotes: z.number(), accountUsers: z.array(z.any()), note1PlusUsers: z.array(z.any()), note5PlusUsers: z.array(z.any()) }),
  allUsers: z.array(z.any()),
  ftueFunnel: z.array(z.any()),
  metadata: z.object({ daysRequested: z.number(), startDate: z.string(), generatedAt: z.string() }),
});
