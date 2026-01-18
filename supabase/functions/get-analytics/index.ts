import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
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

    // Metric 1: Note-activated Users (daily unique note creators)
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

    // Metric 2: Note-activation Rate (page viewers who created notes)
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

    const response = {
      noteActivatedUsers: {
        dailyCounts,
        rollingAverage7d
      },
      noteActivationRate: {
        dailyRates
      },
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
