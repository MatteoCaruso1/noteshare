import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailyCount {
  date: string;
  count: number;
}

interface RollingAverage {
  date: string;
  average: number;
}

interface ActivationRate {
  date: string;
  viewers: number;
  creators: number;
  rate: number;
}

interface Day7Retention {
  date: string;
  cohortSize: number;
  retained: number;
  rate: number | null;
}

interface PaidConversion {
  totalActive: number;
  inTrial: number;
  actuallyPaying: number;
}

interface TrialToPaidRate {
  trialsEndedLast7Days: number;
  converted: number;
  rate: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    // Get auth header and verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create client with user's JWT to check admin status
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin using service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminCheck) {
      console.log('Admin check failed:', adminError);
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse query params
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    console.log(`Fetching analytics for last ${days} days, starting from ${startDateStr}`);

    // ============================================
    // Metric 1: Note-activated Users (daily unique note creators)
    // ============================================
    const { data: notesData, error: notesError } = await supabaseAdmin
      .from('notes')
      .select('author_id, created_at')
      .gte('created_at', startDateStr);

    if (notesError) {
      console.error('Notes query error:', notesError);
      throw notesError;
    }

    // Aggregate notes by date
    const notesByDate = new Map<string, Set<string>>();
    for (const note of notesData || []) {
      const date = note.created_at.split('T')[0];
      if (!notesByDate.has(date)) {
        notesByDate.set(date, new Set());
      }
      notesByDate.get(date)!.add(note.author_id);
    }

    // Build daily counts array
    const dailyCounts: DailyCount[] = [];
    const currentDate = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(currentDate.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const users = notesByDate.get(dateStr);
      dailyCounts.push({
        date: dateStr,
        count: users ? users.size : 0
      });
    }

    // Calculate 7-day rolling average
    const rollingAverage7d: RollingAverage[] = [];
    for (let i = 0; i < dailyCounts.length; i++) {
      const windowStart = Math.max(0, i - 6);
      const window = dailyCounts.slice(windowStart, i + 1);
      const sum = window.reduce((acc, d) => acc + d.count, 0);
      const avg = sum / window.length;
      rollingAverage7d.push({
        date: dailyCounts[i].date,
        average: Math.round(avg * 100) / 100
      });
    }

    // ============================================
    // Metric 2: Note-activation Rate (page viewers who created notes)
    // ============================================
    const { data: pageViewsData, error: pageViewsError } = await supabaseAdmin
      .from('page_views')
      .select('user_id, viewed_at')
      .eq('page_name', 'practice')
      .gte('viewed_at', startDateStr);

    if (pageViewsError) {
      console.error('Page views query error:', pageViewsError);
      // Don't throw - this table may be empty initially
    }

    // Aggregate page views by date
    const viewersByDate = new Map<string, Set<string>>();
    for (const view of pageViewsData || []) {
      const date = view.viewed_at.split('T')[0];
      if (!viewersByDate.has(date)) {
        viewersByDate.set(date, new Set());
      }
      viewersByDate.get(date)!.add(view.user_id);
    }

    // Calculate activation rate for each day
    const dailyRates: ActivationRate[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(currentDate.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const viewers = viewersByDate.get(dateStr)?.size || 0;
      const creators = notesByDate.get(dateStr)?.size || 0;
      
      // Only calculate rate if there were viewers
      const rate = viewers > 0 ? Math.round((creators / viewers) * 10000) / 100 : 0;
      
      dailyRates.push({
        date: dateStr,
        viewers,
        creators,
        rate
      });
    }

    // ============================================
    // Metric 3: Day 7 Core Retention (Note → Note)
    // ============================================
    // Get all notes to find each user's first note date
    const { data: allNotesData, error: allNotesError } = await supabaseAdmin
      .from('notes')
      .select('author_id, created_at')
      .order('created_at', { ascending: true });

    if (allNotesError) {
      console.error('All notes query error:', allNotesError);
      throw allNotesError;
    }

    // Find each user's first note date
    const userFirstNoteDate = new Map<string, string>();
    for (const note of allNotesData || []) {
      const authorId = note.author_id;
      const noteDate = note.created_at.split('T')[0];
      if (!userFirstNoteDate.has(authorId)) {
        userFirstNoteDate.set(authorId, noteDate);
      }
    }

    // Build notes by user and date for retention checking
    const notesByUserAndDate = new Map<string, Set<string>>();
    for (const note of allNotesData || []) {
      const key = `${note.author_id}:${note.created_at.split('T')[0]}`;
      if (!notesByUserAndDate.has(key)) {
        notesByUserAndDate.set(key, new Set());
      }
      notesByUserAndDate.get(key)!.add(note.created_at);
    }

    // Calculate Day 7 retention for each day in the range
    const day7RetentionRates: Day7Retention[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const cohortDate = new Date();
      cohortDate.setDate(currentDate.getDate() - i);
      const cohortDateStr = cohortDate.toISOString().split('T')[0];
      
      // Find users whose first note was on this cohort date
      const cohortUsers: string[] = [];
      userFirstNoteDate.forEach((firstNoteDate, userId) => {
        if (firstNoteDate === cohortDateStr) {
          cohortUsers.push(userId);
        }
      });

      // Check how many returned 7 days later
      const retentionDate = new Date(cohortDate);
      retentionDate.setDate(retentionDate.getDate() + 7);
      const retentionDateStr = retentionDate.toISOString().split('T')[0];

      let retainedCount = 0;
      for (const userId of cohortUsers) {
        const key = `${userId}:${retentionDateStr}`;
        if (notesByUserAndDate.has(key)) {
          retainedCount++;
        }
      }

      const cohortSize = cohortUsers.length;
      const rate = cohortSize > 0 ? Math.round((retainedCount / cohortSize) * 10000) / 100 : null;

      day7RetentionRates.push({
        date: cohortDateStr,
        cohortSize,
        retained: retainedCount,
        rate
      });
    }

    // Get today's Day 7 retention (for users who joined 7 days ago)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    // Find users whose first note was exactly 7 days ago
    const cohortFrom7DaysAgo: string[] = [];
    userFirstNoteDate.forEach((firstNoteDate, userId) => {
      if (firstNoteDate === sevenDaysAgoStr) {
        cohortFrom7DaysAgo.push(userId);
      }
    });

    let retainedToday = 0;
    for (const userId of cohortFrom7DaysAgo) {
      const key = `${userId}:${todayStr}`;
      if (notesByUserAndDate.has(key)) {
        retainedToday++;
      }
    }

    const todayRetention = {
      cohortSize: cohortFrom7DaysAgo.length,
      retained: retainedToday,
      rate: cohortFrom7DaysAgo.length > 0 
        ? Math.round((retainedToday / cohortFrom7DaysAgo.length) * 10000) / 100 
        : null
    };

    // ============================================
    // Metrics 4 & 5: Stripe Subscription Analysis
    // ============================================
    let paidConversion: PaidConversion = {
      totalActive: 0,
      inTrial: 0,
      actuallyPaying: 0
    };

    let trialToPaidRate: TrialToPaidRate = {
      trialsEndedLast7Days: 0,
      converted: 0,
      rate: 0
    };

    if (stripeSecretKey) {
      try {
        const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
        console.log('Fetching Stripe subscription data...');

        // Metric 4: Get active subscriptions (trialing + active)
        const activeSubscriptions = await stripe.subscriptions.list({
          status: 'active',
          limit: 100,
        });

        const trialingSubscriptions = await stripe.subscriptions.list({
          status: 'trialing',
          limit: 100,
        });

        const inTrial = trialingSubscriptions.data.length;
        const actuallyPaying = activeSubscriptions.data.length;
        const totalActive = inTrial + actuallyPaying;

        paidConversion = {
          totalActive,
          inTrial,
          actuallyPaying
        };

        console.log(`Stripe: ${totalActive} active (${inTrial} trial, ${actuallyPaying} paying)`);

        // Metric 5: Trial to Paid Conversion Rate (last 7 days)
        // Get all subscriptions to check trial_end dates
        const allSubscriptions = await stripe.subscriptions.list({
          status: 'all',
          limit: 100,
        });

        const now = new Date();
        const sevenDaysAgoMs = now.getTime() - (7 * 24 * 60 * 60 * 1000);

        let trialsEndedLast7Days = 0;
        let converted = 0;

        for (const sub of allSubscriptions.data) {
          // Check if subscription had a trial that ended in the last 7 days
          if (sub.trial_end) {
            const trialEndDate = new Date(sub.trial_end * 1000);
            if (trialEndDate.getTime() >= sevenDaysAgoMs && trialEndDate.getTime() <= now.getTime()) {
              trialsEndedLast7Days++;
              // Check if they converted (active status means they're now paying)
              if (sub.status === 'active') {
                converted++;
              }
            }
          }
        }

        const conversionRate = trialsEndedLast7Days > 0 
          ? Math.round((converted / trialsEndedLast7Days) * 10000) / 100 
          : 0;

        trialToPaidRate = {
          trialsEndedLast7Days,
          converted,
          rate: conversionRate
        };

        console.log(`Trial conversion: ${converted}/${trialsEndedLast7Days} = ${conversionRate}%`);

      } catch (stripeError) {
        console.error('Stripe API error:', stripeError);
        // Continue with zero values for Stripe metrics
      }
    } else {
      console.log('STRIPE_SECRET_KEY not configured, skipping subscription metrics');
    }

    const response = {
      noteActivatedUsers: {
        dailyCounts,
        rollingAverage7d
      },
      noteActivationRate: {
        dailyRates
      },
      day7Retention: {
        dailyRates: day7RetentionRates,
        today: todayRetention
      },
      paidConversion,
      trialToPaidRate,
      metadata: {
        daysRequested: days,
        startDate: startDateStr,
        generatedAt: new Date().toISOString()
      }
    };

    console.log('Analytics response generated successfully');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
