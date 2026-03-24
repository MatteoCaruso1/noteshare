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

interface PremiumUser {
  name: string;
  username: string;
  email: string;
  type: 'subscription' | 'lifetime' | 'trial' | 'override';
  status: string;
}

interface NoteActivatedUser {
  name: string;
  username: string;
  noteCount: number;
}

interface FriendCountUser {
  name: string;
  username: string;
  friendCount: number;
}

interface TryProClickUser {
  name: string;
  username: string;
  clickCount: number;
}

interface MobileSessionUser {
  name: string;
  username: string;
  mobileCount: number;
  totalCount: number;
  mobilePercent: number;
}

interface FunnelUser {
  name: string;
  username: string;
  noteCount: number;
  friendCount: number;
}

interface AccountFunnel {
  accountsCreated: number;
  with1PlusNotes: number;
  with5PlusNotes: number;
  accountUsers: FunnelUser[];
  note1PlusUsers: FunnelUser[];
  note5PlusUsers: FunnelUser[];
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
    const drilldownDate = url.searchParams.get('drilldown_date');

    // ============================================
    // Lightweight drilldown: return viewer/creator user lists for a single date
    // ============================================
    if (drilldownDate) {
      console.log(`Drilldown request for date: ${drilldownDate}`);

      // Fetch viewers (page_views) for that date
      const nextDay = new Date(drilldownDate + 'T00:00:00Z');
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];

      const [pageViewsRes, notesRes] = await Promise.all([
        supabaseAdmin
          .from('page_views')
          .select('user_id')
          .eq('page_name', 'practice')
          .gte('viewed_at', drilldownDate)
          .lt('viewed_at', nextDayStr),
        supabaseAdmin
          .from('notes')
          .select('author_id')
          .gte('created_at', drilldownDate)
          .lt('created_at', nextDayStr),
      ]);

      // Unique viewer user_ids (auth UIDs from page_views)
      const viewerAuthIds = new Set<string>();
      for (const v of pageViewsRes.data || []) {
        viewerAuthIds.add(v.user_id);
      }
      // Unique creator profile IDs
      const creatorProfileIds = new Set<string>();
      for (const n of notesRes.data || []) {
        creatorProfileIds.add(n.author_id);
      }

      // Resolve creator profiles
      const creatorIds = Array.from(creatorProfileIds);
      const { data: creatorProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id, name, username')
        .in('id', creatorIds.length > 0 ? creatorIds : ['00000000-0000-0000-0000-000000000000']);

      // Add creator auth UIDs to viewers set (union)
      for (const p of creatorProfiles || []) {
        if (p.user_id) viewerAuthIds.add(p.user_id);
      }

      // Resolve viewer profiles (by auth user_id)
      const viewerIds = Array.from(viewerAuthIds);
      const { data: viewerProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id, name, username')
        .in('user_id', viewerIds.length > 0 ? viewerIds : ['00000000-0000-0000-0000-000000000000']);

      const viewers = (viewerProfiles || []).map(p => ({ name: p.name, username: p.username }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const creators = (creatorProfiles || []).map(p => ({ name: p.name, username: p.username }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return new Response(JSON.stringify({ date: drilldownDate, viewers, creators }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
    // Note creators must have viewed the page, so union them into viewers
    const dailyRates: ActivationRate[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(currentDate.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Merge note creators into viewers set so viewers >= creators always
      const viewersSet = new Set(viewersByDate.get(dateStr) || []);
      const creatorsSet = notesByDate.get(dateStr);
      if (creatorsSet) {
        for (const creatorId of creatorsSet) {
          viewersSet.add(creatorId);
        }
      }
      
      const viewers = viewersSet.size;
      const creators = creatorsSet?.size || 0;
      
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
      
      const cohortUsers: string[] = [];
      userFirstNoteDate.forEach((firstNoteDate, userId) => {
        if (firstNoteDate === cohortDateStr) {
          cohortUsers.push(userId);
        }
      });

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

    // Get today's Day 7 retention
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

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
    // Note-activated users list (FILTERED by date range)
    // ============================================
    const noteCountByUserFiltered = new Map<string, number>();
    for (const note of notesData || []) {
      const count = noteCountByUserFiltered.get(note.author_id) || 0;
      noteCountByUserFiltered.set(note.author_id, count + 1);
    }

    const filteredNoteUserIds = Array.from(noteCountByUserFiltered.keys());
    const { data: filteredNoteUserProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name, username')
      .in('id', filteredNoteUserIds.length > 0 ? filteredNoteUserIds : ['00000000-0000-0000-0000-000000000000']);

    const noteActivatedUsersList: NoteActivatedUser[] = (filteredNoteUserProfiles || [])
      .map(p => ({
        name: p.name,
        username: p.username,
        noteCount: noteCountByUserFiltered.get(p.id) || 0
      }))
      .sort((a, b) => b.noteCount - a.noteCount);

    // ============================================
    // NEW: Friends count by account
    // ============================================
    const { data: friendshipsData } = await supabaseAdmin
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted');

    const friendCountByUser = new Map<string, number>();
    for (const f of friendshipsData || []) {
      friendCountByUser.set(f.requester_id, (friendCountByUser.get(f.requester_id) || 0) + 1);
      friendCountByUser.set(f.addressee_id, (friendCountByUser.get(f.addressee_id) || 0) + 1);
    }

    // Use all note-activated user profiles (already fetched) so everyone shows up, even with 0 friends
    const friendCountUsers: FriendCountUser[] = (filteredNoteUserProfiles || [])
      .map(p => ({
        name: p.name,
        username: p.username,
        friendCount: friendCountByUser.get(p.id) || 0
      }))
      .sort((a, b) => b.friendCount - a.friendCount);

    // ============================================
    // NEW: Try Pro button clicks by account (lifetime)
    // ============================================
    const { data: tryProViews } = await supabaseAdmin
      .from('page_views')
      .select('user_id')
      .eq('page_name', 'try_pro');

    const tryProCountByUser = new Map<string, number>();
    for (const v of tryProViews || []) {
      tryProCountByUser.set(v.user_id, (tryProCountByUser.get(v.user_id) || 0) + 1);
    }

    // Get profiles for try_pro users - need to match by user_id (auth uid)
    const tryProUserIds = Array.from(tryProCountByUser.keys());
    const { data: tryProUserProfiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, name, username')
      .in('user_id', tryProUserIds.length > 0 ? tryProUserIds : ['00000000-0000-0000-0000-000000000000']);

    const tryProClickUsers: TryProClickUser[] = (tryProUserProfiles || [])
      .map(p => ({
        name: p.name,
        username: p.username,
        clickCount: tryProCountByUser.get(p.user_id!) || 0
      }))
      .sort((a, b) => b.clickCount - a.clickCount);

    // ============================================
    // NEW: Mobile session percentage by account (since is_mobile tracking deployed)
    // ============================================
    const MOBILE_TRACKING_START = '2026-02-25T00:00:00Z';
    const { data: allSessions } = await supabaseAdmin
      .from('practice_sessions')
      .select('user_id, is_mobile')
      .not('ended_at', 'is', null)
      .gte('created_at', MOBILE_TRACKING_START);

    const mobileStatsByUser = new Map<string, { mobile: number; total: number }>();
    for (const s of allSessions || []) {
      const stats = mobileStatsByUser.get(s.user_id) || { mobile: 0, total: 0 };
      stats.total++;
      if (s.is_mobile) stats.mobile++;
      mobileStatsByUser.set(s.user_id, stats);
    }

    const mobileUserIds = Array.from(mobileStatsByUser.keys());
    const { data: mobileUserProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name, username')
      .in('id', mobileUserIds.length > 0 ? mobileUserIds : ['00000000-0000-0000-0000-000000000000']);

    const mobileSessionUsers: MobileSessionUser[] = (mobileUserProfiles || [])
      .map(p => {
        const stats = mobileStatsByUser.get(p.id) || { mobile: 0, total: 0 };
        return {
          name: p.name,
          username: p.username,
          mobileCount: stats.mobile,
          totalCount: stats.total,
          mobilePercent: stats.total > 0 ? Math.round((stats.mobile / stats.total) * 10000) / 100 : 0
        };
      })
      .sort((a, b) => b.totalCount - a.totalCount);

    // ============================================
    // Account Funnel (accounts created → 1+ notes → 5+ notes)
    // ============================================
    const { data: accountsInRange } = await supabaseAdmin
      .from('profiles')
      .select('id, name, username, created_at')
      .gte('created_at', startDateStr);

    const accountProfileIds = new Set((accountsInRange || []).map(p => p.id));

    // Count notes per account (all-time notes for users created in range)
    const { data: allTimeNotesForAccounts } = await supabaseAdmin
      .from('notes')
      .select('author_id')
      .in('author_id', accountsInRange && accountsInRange.length > 0 
        ? accountsInRange.map(p => p.id) 
        : ['00000000-0000-0000-0000-000000000000']);

    const noteCountByAccount = new Map<string, number>();
    for (const n of allTimeNotesForAccounts || []) {
      noteCountByAccount.set(n.author_id, (noteCountByAccount.get(n.author_id) || 0) + 1);
    }

    // Build funnel user lists with friend counts
    const buildFunnelUser = (p: { id: string; name: string; username: string }): FunnelUser => ({
      name: p.name,
      username: p.username,
      noteCount: noteCountByAccount.get(p.id) || 0,
      friendCount: friendCountByUser.get(p.id) || 0,
    });

    const allAccountUsers = (accountsInRange || []).map(buildFunnelUser).sort((a, b) => b.noteCount - a.noteCount);
    const note1PlusUsers = allAccountUsers.filter(u => u.noteCount >= 1);
    const note5PlusUsers = allAccountUsers.filter(u => u.noteCount >= 5);

    const accountFunnel: AccountFunnel = {
      accountsCreated: allAccountUsers.length,
      with1PlusNotes: note1PlusUsers.length,
      with5PlusNotes: note5PlusUsers.length,
      accountUsers: allAccountUsers,
      note1PlusUsers,
      note5PlusUsers,
    };

    // ============================================
    // Stripe Subscription Analysis
    // ============================================
    // Lifetime access price IDs (CAD and USD variants)
    const LIFETIME_PRICE_IDS = [
      "price_1Sw8hBGiNcIsULtkxrZRuf6O", // CAD $9.99 lifetime
      "price_1SwEHaGiNcIsULtkrQuVwm7M", // USD $9.99 lifetime
      "price_1Sv63tGiNcIsULtk4t3RRrAK", // Old $19.99 CAD lifetime
    ];

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

    let premiumUsers: PremiumUser[] = [];

    if (stripeSecretKey) {
      try {
        const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
        console.log('Fetching Stripe subscription data...');

        const activeSubscriptions = await stripe.subscriptions.list({
          status: 'active',
          limit: 100,
          expand: ['data.customer'],
        });

        const trialingSubscriptions = await stripe.subscriptions.list({
          status: 'trialing',
          limit: 100,
          expand: ['data.customer'],
        });

        // ---- Lifetime purchases ----
        // Get all customers, then check for lifetime payment intents
        const allCustomers = await stripe.customers.list({ limit: 100 });
        const lifetimeCustomerIds = new Set<string>();

        for (const customer of allCustomers.data) {
          const paymentIntents = await stripe.paymentIntents.list({
            customer: customer.id,
            limit: 50,
          });

          for (const pi of paymentIntents.data) {
            if (pi.status === 'succeeded') {
              const sessions = await stripe.checkout.sessions.list({
                payment_intent: pi.id,
                limit: 1,
              });

              if (sessions.data.length > 0 && sessions.data[0].mode === 'payment') {
                const fullSession = await stripe.checkout.sessions.retrieve(sessions.data[0].id, {
                  expand: ['line_items'],
                });

                const hasLifetimePrice = fullSession.line_items?.data?.some(
                  (item: Stripe.LineItem) => LIFETIME_PRICE_IDS.includes(item.price?.id ?? '')
                );

                if (hasLifetimePrice) {
                  lifetimeCustomerIds.add(customer.id);
                  // Don't double-count if they also have an active subscription
                  const alreadyInActive = activeSubscriptions.data.some(
                    s => (s.customer as Stripe.Customer).id === customer.id
                  );
                  if (!alreadyInActive) {
                    premiumUsers.push({
                      name: customer.name || 'Unknown',
                      username: '',
                      email: customer.email || '',
                      type: 'lifetime',
                      status: 'lifetime'
                    });
                  }
                  break; // Found lifetime for this customer, move on
                }
              }
            }
          }
        }

        console.log(`Found ${lifetimeCustomerIds.size} lifetime customers`);

        const inTrial = trialingSubscriptions.data.length;
        const actuallyPaying = activeSubscriptions.data.length;
        // Count lifetime users who don't also have an active subscription
        const lifetimeOnlyCount = [...lifetimeCustomerIds].filter(
          id => !activeSubscriptions.data.some(s => (s.customer as Stripe.Customer).id === id)
        ).length;
        const totalActive = inTrial + actuallyPaying + lifetimeOnlyCount;

        paidConversion = { totalActive, inTrial, actuallyPaying: actuallyPaying + lifetimeOnlyCount };

        console.log(`Stripe: ${totalActive} active (${inTrial} trial, ${actuallyPaying} subscription, ${lifetimeOnlyCount} lifetime-only)`);

        for (const sub of activeSubscriptions.data) {
          const customer = sub.customer as Stripe.Customer;
          premiumUsers.push({
            name: customer.name || 'Unknown',
            username: '',
            email: customer.email || '',
            type: lifetimeCustomerIds.has(customer.id) ? 'lifetime' : 'subscription',
            status: 'active'
          });
        }

        for (const sub of trialingSubscriptions.data) {
          const customer = sub.customer as Stripe.Customer;
          premiumUsers.push({
            name: customer.name || 'Unknown',
            username: '',
            email: customer.email || '',
            type: 'trial',
            status: 'trialing'
          });
        }

        // Get usernames from profiles based on email
        const premiumEmails = premiumUsers.map(u => u.email).filter(Boolean);
        if (premiumEmails.length > 0) {
          // Look up auth users by email to get user_ids, then match profiles
          const { data: allProfiles } = await supabaseAdmin
            .from('profiles')
            .select('name, username, user_id');

          // Get auth user emails for matching
          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
          
          const emailToProfile = new Map<string, { name: string; username: string }>();
          for (const authUser of authUsers?.users || []) {
            const profile = allProfiles?.find(p => p.user_id === authUser.id);
            if (profile && authUser.email) {
              emailToProfile.set(authUser.email.toLowerCase(), { name: profile.name, username: profile.username });
            }
          }

          for (const pu of premiumUsers) {
            if (pu.email) {
              const match = emailToProfile.get(pu.email.toLowerCase());
              if (match) {
                pu.username = match.username;
                pu.name = match.name;
              }
            }
          }
        }

        // Trial to Paid Conversion Rate (last 7 days)
        const allSubscriptions = await stripe.subscriptions.list({
          status: 'all',
          limit: 100,
        });

        const now = new Date();
        const sevenDaysAgoMs = now.getTime() - (7 * 24 * 60 * 60 * 1000);

        let trialsEndedLast7Days = 0;
        let converted = 0;

        for (const sub of allSubscriptions.data) {
          if (sub.trial_end) {
            const trialEndDate = new Date(sub.trial_end * 1000);
            if (trialEndDate.getTime() >= sevenDaysAgoMs && trialEndDate.getTime() <= now.getTime()) {
              trialsEndedLast7Days++;
              if (sub.status === 'active') {
                converted++;
              }
            }
          }
        }

        const conversionRate = trialsEndedLast7Days > 0 
          ? Math.round((converted / trialsEndedLast7Days) * 10000) / 100 
          : 0;

        trialToPaidRate = { trialsEndedLast7Days, converted, rate: conversionRate };

        console.log(`Trial conversion: ${converted}/${trialsEndedLast7Days} = ${conversionRate}%`);

      } catch (stripeError) {
        console.error('Stripe API error:', stripeError);
      }
    } else {
      console.log('STRIPE_SECRET_KEY not configured, skipping subscription metrics');
    }

    // Also check for premium overrides (developer accounts)
    const { data: overrides } = await supabaseAdmin
      .from('premium_overrides')
      .select('user_id, note')
      .eq('enabled', true);

    if (overrides && overrides.length > 0) {
      const overrideUserIds = overrides.map(o => o.user_id);
      const { data: overrideProfiles } = await supabaseAdmin
        .from('profiles')
        .select('user_id, name, username')
        .in('user_id', overrideUserIds);

      for (const profile of overrideProfiles || []) {
        const override = overrides.find(o => o.user_id === profile.user_id);
        premiumUsers.push({
          name: profile.name,
          username: profile.username,
          email: '',
          type: 'override',
          status: override?.note || 'Developer override'
        });
      }
    }

    // ============================================
    // All Users with email and note counts
    // ============================================
    const { data: allProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, name, username, created_at');

    const { data: authUsersList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

    const authEmailMap = new Map<string, string>();
    for (const au of authUsersList?.users || []) {
      if (au.email) authEmailMap.set(au.id, au.email);
    }

    // Count all-time notes per author
    const allTimeNoteCount = new Map<string, number>();
    for (const note of allNotesData || []) {
      allTimeNoteCount.set(note.author_id, (allTimeNoteCount.get(note.author_id) || 0) + 1);
    }

    const allUsers = (allProfiles || []).map(p => ({
      name: p.name,
      username: p.username,
      email: p.user_id ? (authEmailMap.get(p.user_id) || '') : '',
      noteCount: allTimeNoteCount.get(p.id) || 0,
      createdAt: p.created_at,
    })).sort((a, b) => b.noteCount - a.noteCount);

    // ── FTUE funnel ──
    // FTUE steps are stored with 100+ offset (100=phase0, 101=phase1, etc.)
    // 110=account created, 111=complete
    const { data: ftueRows } = await supabaseAdmin
      .from('onboarding_step_events')
      .select('step_number, user_id')
      .gte('step_number', 100)
      .lte('step_number', 111);

    const ftueStepCounts: Record<number, number> = {};
    if (ftueRows) {
      for (const r of ftueRows) {
        // Map 100+ back to 0-based for display
        const displayStep = r.step_number - 100;
        ftueStepCounts[displayStep] = (ftueStepCounts[displayStep] || 0) + 1;
      }
    }
    // Build array 0-11
    const ftueFunnel = Array.from({ length: 12 }, (_, i) => ({
      step: i,
      users: ftueStepCounts[i] || 0,
    }));

    const response = {
      noteActivatedUsers: {
        dailyCounts,
        rollingAverage7d,
        users: noteActivatedUsersList
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
      premiumUsers,
      friendCountUsers,
      accountFunnel,
      tryProClickUsers,
      mobileSessionUsers,
      allUsers,
      ftueFunnel,
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
