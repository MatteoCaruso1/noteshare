import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, subWeeks, subMonths, differenceInMinutes, parseISO, format, startOfMonth, subDays, isWithinInterval } from 'date-fns';

interface PracticeStats {
  // Number of sessions
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  
  // Minutes practiced
  totalMinutesThisWeek: number;
  totalMinutesThisMonth: number;
  
  // Progress
  weeklyMinutesOverTime: { week: string; minutes: number }[];
  currentStreak: number;
  bestDailyStreak: number;
  bestWeekMinutes: { week: string; minutes: number } | null;
  
  // Themes
  topKeywordsThisMonth: { keyword: string; count: number }[];
  topTagsThisMonth: { tag: string; count: number }[];
}

export function usePracticeStats(profileId: string | undefined) {
  return useQuery({
    queryKey: ['practice-stats', profileId],
    queryFn: async (): Promise<PracticeStats> => {
      if (!profileId) throw new Error('Profile ID required');

      // Add timeout wrapper to prevent hanging requests
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });

      const now = new Date();
      const threeMonthsAgo = subMonths(now, 3);
      const thisMonthStart = startOfMonth(now);

      // Run both queries in parallel for better performance
      const [sessionsResult, notesResult] = await Promise.all([
        supabase
          .from('practice_sessions')
          .select('started_at, ended_at')
          .eq('user_id', profileId)
          .gte('started_at', threeMonthsAgo.toISOString())
          .order('started_at', { ascending: true }),
        supabase
          .from('notes')
          .select('text_content, tags, created_at')
          .eq('author_id', profileId)
          .gte('created_at', threeMonthsAgo.toISOString())
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (notesResult.error) throw notesResult.error;

      const sessions = sessionsResult.data || [];
      const notes = notesResult.data || [];

      // Calculate session durations
      const sessionsWithDuration = sessions.map(session => {
        const start = parseISO(session.started_at);
        const end = session.ended_at ? parseISO(session.ended_at) : now;
        const durationMinutes = Math.max(0, differenceInMinutes(end, start));
        return { durationMinutes, startDate: start };
      });

      // Time boundaries
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const oneMonthAgo = subMonths(now, 1);

      // Number of sessions - This week
      const sessionsThisWeek = sessionsWithDuration.filter(s => 
        s.startDate >= thisWeekStart
      ).length;

      // Number of sessions - This month
      const sessionsThisMonth = sessionsWithDuration.filter(s => 
        s.startDate >= thisMonthStart
      ).length;

      // Minutes practiced - This week
      const totalMinutesThisWeek = sessionsWithDuration
        .filter(s => s.startDate >= thisWeekStart)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      // Minutes practiced - This month
      const totalMinutesThisMonth = sessionsWithDuration
        .filter(s => s.startDate >= thisMonthStart)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      // Weekly minutes over time (last 12 weeks)
      const weeklyMinutesOverTime: { week: string; minutes: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekMinutes = sessionsWithDuration
          .filter(s => isWithinInterval(s.startDate, { start: weekStart, end: weekEnd }))
          .reduce((sum, s) => sum + s.durationMinutes, 0);
        weeklyMinutesOverTime.push({
          week: format(weekStart, 'MMM d'),
          minutes: weekMinutes
        });
      }

      // Best week
      const bestWeekMinutes = weeklyMinutesOverTime.reduce((best, current) => 
        current.minutes > (best?.minutes || 0) ? current : best, 
        null as { week: string; minutes: number } | null
      );

      // Daily streak calculation (current and best)
      // Include BOTH practice sessions AND notes for streak
      const activityDates = new Set<string>();
      
      // Add session dates
      sessionsWithDuration.forEach(s => {
        activityDates.add(format(s.startDate, 'yyyy-MM-dd'));
      });
      
      // Add note dates (quick notes count towards streak too)
      notes.forEach(note => {
        activityDates.add(format(parseISO(note.created_at), 'yyyy-MM-dd'));
      });
      
      let bestDailyStreak = 0;
      let tempStreak = 0;
      
      // Calculate best streak from last 90 days
      for (let i = 90; i >= 0; i--) {
        const checkDate = format(subDays(now, i), 'yyyy-MM-dd');
        if (activityDates.has(checkDate)) {
          tempStreak++;
          bestDailyStreak = Math.max(bestDailyStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }

      // Calculate current streak (consecutive days ending today or yesterday)
      let currentStreak = 0;
      const today = format(now, 'yyyy-MM-dd');
      const yesterday = format(subDays(now, 1), 'yyyy-MM-dd');
      
      // Start counting from today or yesterday
      let startDay = 0;
      if (activityDates.has(today)) {
        startDay = 0;
      } else if (activityDates.has(yesterday)) {
        startDay = 1;
      } else {
        currentStreak = 0;
      }

      if (activityDates.has(today) || activityDates.has(yesterday)) {
        for (let i = startDay; i < 90; i++) {
          const checkDate = format(subDays(now, i), 'yyyy-MM-dd');
          if (activityDates.has(checkDate)) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Keyword extraction from text content (this month only)
      const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'i', 'my', 'me', 'we', 'our', 'you', 'your', 'it', 'its', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'would', 'could', 'should', 'might', 'must', 'shall', 'today', 'session', 'practice', 'practiced', 'working', 'worked']);

      const keywords: Record<string, number> = {};
      const tags: Record<string, number> = {};

      // Filter notes to this month for keyword analysis
      const thisMonthNotes = notes.filter(note => 
        parseISO(note.created_at) >= thisMonthStart
      );

      thisMonthNotes.forEach(note => {
        // Extract tags separately
        (note.tags || []).forEach(tag => {
          const lowerTag = tag.toLowerCase().trim();
          if (lowerTag.length > 0) {
            tags[lowerTag] = (tags[lowerTag] || 0) + 1;
          }
        });
        
        // Extract from text content for keywords
        if (note.text_content) {
          const words = note.text_content
            .toLowerCase()
            .replace(/[^a-z\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.has(word));
          
          words.forEach(word => {
            keywords[word] = (keywords[word] || 0) + 1;
          });
        }
      });

      const topKeywordsThisMonth = Object.entries(keywords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([keyword, count]) => ({ keyword, count }));

      const topTagsThisMonth = Object.entries(tags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));

      // Update current_streak in profile (fire and forget)
      supabase
        .from('profiles')
        .update({ current_streak: currentStreak })
        .eq('id', profileId)
        .then(() => {});

      return {
        sessionsThisWeek,
        sessionsThisMonth,
        totalMinutesThisWeek,
        totalMinutesThisMonth,
        weeklyMinutesOverTime,
        currentStreak,
        bestDailyStreak,
        bestWeekMinutes,
        topKeywordsThisMonth,
        topTagsThisMonth,
      };
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Only retry once on failure
    retryDelay: 1000,
  });
}
