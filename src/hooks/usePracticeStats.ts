import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, subWeeks, subMonths, subDays, differenceInMinutes, parseISO, format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useAuth } from './useAuth';

interface PracticeStats {
  // Number of sessions
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  
  // Minutes practiced
  totalMinutesThisWeek: number;
  totalMinutesThisMonth: number;
  
  // Progress
  weeklyMinutesOverTime: { week: string; minutes: number }[];
  weeklyDaysPracticed: { week: string; days: number }[];
  currentStreak: number;
  bestDailyStreak: number;
  bestWeekMinutes: { week: string; minutes: number } | null;
  
  // Personal bests
  bestDayMinutes: { date: string; minutes: number } | null;
  bestMonthMinutes: { month: string; minutes: number } | null;
  lastMonthTotal: number;
  
  // Themes
  topKeywordsThisMonth: { keyword: string; count: number }[];
  topTagsThisMonth: { tag: string; count: number }[];

  // Calendar heatmap: date string -> total minutes
  dailyMinutesMap: Record<string, number>;

  // Total notes created (all time)
  totalNotesCount: number;

  // Notes created in last 30 days
  notesLast30Days: number;

  // Total all-time minutes (from loaded sessions window)
  totalAllTimeMinutes: number;

  // Weekly average focus level (from F=N tags)
  weeklyFocusAverage: { week: string; average: number }[];

  // Consistency: best single-month days practiced count
  bestMonthDays: number;

  // Consistency: best completed calendar year practice % (0-100)
  bestCompletedYearPct: number;

  // Consistency: number of weekly goals met
  weeklyGoalsMetCount: number;
}

export function usePracticeStats(profileId: string | undefined) {
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();
  
  return useQuery({
    queryKey: ['practice-stats', profileId],
    queryFn: async (): Promise<PracticeStats> => {
      // Return empty stats instead of throwing - prevents ErrorBoundary trigger during auth transitions
      if (!profileId) {
        return {
          sessionsThisWeek: 0,
          sessionsThisMonth: 0,
          totalMinutesThisWeek: 0,
          totalMinutesThisMonth: 0,
          weeklyMinutesOverTime: [],
          weeklyDaysPracticed: [],
          currentStreak: 0,
          bestDailyStreak: 0,
          bestWeekMinutes: null,
          bestDayMinutes: null,
          bestMonthMinutes: null,
          lastMonthTotal: 0,
          topKeywordsThisMonth: [],
          topTagsThisMonth: [],
          dailyMinutesMap: {},
          totalNotesCount: 0,
          notesLast30Days: 0,
          totalAllTimeMinutes: 0,
          weeklyFocusAverage: [],
          bestMonthDays: 0,
          bestCompletedYearPct: 0,
          weeklyGoalsMetCount: 0,
        };
      }

      // Add timeout wrapper to prevent hanging requests (15s for slower mobile networks)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 15000);
      });

      const now = new Date();
      const oneYearAgo = subDays(now, 365);
      const threeMonthsAgo = subMonths(now, 3);
      const thisMonthStart = startOfMonth(now);

      // Run all queries in parallel for better performance
      const [sessionsResult, notesResult, focusResult, backlogResult, notesCountResult, notesLast30Result] = await Promise.all([
        supabase
          .from('practice_sessions')
          .select('id, started_at, ended_at, paused_duration_ms')
          .eq('user_id', profileId)
          .gte('started_at', oneYearAgo.toISOString())
          .order('started_at', { ascending: true }),
        supabase
          .from('notes')
          .select('text_content, tags, created_at, session_id')
          .eq('author_id', profileId)
          .gte('created_at', threeMonthsAgo.toISOString()),
        supabase
          .from('daily_focus')
          .select('focus_text, focus_date, created_at')
          .eq('user_id', profileId)
          .gte('created_at', threeMonthsAgo.toISOString()),
        supabase
          .from('focus_backlog')
          .select('focus_text, saved_at')
          .eq('user_id', profileId)
          .gte('saved_at', threeMonthsAgo.toISOString()),
        supabase
          .from('notes')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', profileId),
        supabase
          .from('notes')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', profileId)
          .gte('created_at', subDays(now, 30).toISOString())
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (notesResult.error) throw notesResult.error;
      // Focus queries are non-critical, don't throw on error
      
      const sessions = sessionsResult.data || [];
      const notes = notesResult.data || [];
      const focusEntries = focusResult.data || [];
      const backlogEntries = backlogResult.data || [];

      // Build set of session IDs that have at least one note linked
      // This filters out orphaned sessions (e.g. force-ended by starting a new session,
      // or sessions whose notes were deleted)
      const sessionIdsWithNotes = new Set(
        notes.filter(n => n.session_id).map(n => n.session_id!)
      );

      // Calculate session durations (accounting for paused time)
      // Only include completed sessions that have associated notes
      const sessionsWithDuration = sessions
        .filter(session => session.ended_at !== null && sessionIdsWithNotes.has(session.id))
        .map(session => {
          const start = parseISO(session.started_at);
          const end = parseISO(session.ended_at!);
          const rawDurationMs = end.getTime() - start.getTime();
          const pausedMs = session.paused_duration_ms || 0;
          const activeDurationMs = rawDurationMs - pausedMs;
          const durationMinutes = Math.max(0, Math.floor(activeDurationMs / 60000));
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

      // Weekly minutes over time (last 52 weeks for flexible filtering)
      const weeklyMinutesOverTime: { week: string; minutes: number }[] = [];
      for (let i = 51; i >= 0; i--) {
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

      // Weekly days practiced (last 12 weeks)
      const weeklyDaysPracticed: { week: string; days: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        
        // Count unique days with activity in this week
        const daysInWeek = new Set<string>();
        sessionsWithDuration.forEach(s => {
          if (isWithinInterval(s.startDate, { start: weekStart, end: weekEnd })) {
            daysInWeek.add(format(s.startDate, 'yyyy-MM-dd'));
          }
        });
        notes.forEach(note => {
          const noteDate = parseISO(note.created_at);
          if (isWithinInterval(noteDate, { start: weekStart, end: weekEnd })) {
            daysInWeek.add(format(noteDate, 'yyyy-MM-dd'));
          }
        });
        
        weeklyDaysPracticed.push({
          week: format(weekStart, 'MMM d'),
          days: daysInWeek.size
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
      
      // Add note dates (only standalone notes — notes tied to sessions are already
      // covered by the session's started_at date, and their created_at can differ
      // from the actual practice date when logging past sessions)
      notes.forEach(note => {
        if (!note.session_id) {
          activityDates.add(format(parseISO(note.created_at), 'yyyy-MM-dd'));
        }
      });
      
      let bestDailyStreak = 0;
      let tempStreak = 0;
      
      // Calculate best streak from all 365 days of data (not just 90)
      for (let i = 365; i >= 0; i--) {
        const checkDate = format(subDays(now, i), 'yyyy-MM-dd');
        if (activityDates.has(checkDate)) {
          tempStreak++;
          bestDailyStreak = Math.max(bestDailyStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }

      // Also check streak_achievement_counts from profile to preserve historical records
      // beyond the data window (e.g., a 30-day streak that happened > 365 days ago)
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('streak_achievement_counts')
          .eq('id', profileId)
          .single();
        if (profileData?.streak_achievement_counts) {
          const counts = profileData.streak_achievement_counts as Record<string, number>;
          const highestMilestone = Math.max(0, ...Object.keys(counts).map(Number).filter(n => !isNaN(n) && counts[String(n)] > 0));
          if (highestMilestone > bestDailyStreak) {
            bestDailyStreak = highestMilestone;
          }
        }
      } catch {
        // Non-critical, fail silently
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
      // Common English stop words + music-generic terms
      const stopWords = new Set([
        // Common English stop words
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'i', 'my', 'me', 'we', 'our', 'you', 'your', 'it', 'its', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'would', 'could', 'should', 'might', 'must', 'shall', 'today', 'want', 'going', 'like', 'really', 'also', 'well', 'still', 'even', 'back', 'much', 'good', 'great', 'keep', 'make', 'made', 'feel', 'thing', 'things', 'need', 'start', 'started', 'trying', 'tried',
        // Music-generic terms (too common to be meaningful themes)
        'song', 'songs', 'piece', 'pieces', 'music', 'musical', 'measure', 'measures', 'bar', 'bars', 'exercise', 'exercises', 'practice', 'practiced', 'practicing', 'session', 'sessions', 'focus', 'focused', 'work', 'worked', 'working', 'play', 'played', 'playing', 'learn', 'learned', 'learning', 'note', 'notes', 'part', 'parts', 'section', 'sections', 'passage', 'passages', 'line', 'lines', 'phrase', 'phrases', 'time', 'times', 'minute', 'minutes', 'hour', 'hours'
      ]);

      // Basic stemming to normalize similar words (e.g., chord/chords, play/playing)
      const stemWord = (word: string): string => {
        // Handle common suffixes - order matters (check longer suffixes first)
        if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
        if (word.endsWith('ches') || word.endsWith('shes') || word.endsWith('sses') || word.endsWith('xes') || word.endsWith('zes')) return word.slice(0, -2);
        if (word.endsWith('ing') && word.length > 5) {
          const stem = word.slice(0, -3);
          // Handle doubled consonants (e.g., running -> run)
          if (stem.length > 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
            return stem.slice(0, -1);
          }
          return stem;
        }
        if (word.endsWith('ed') && word.length > 4) {
          const stem = word.slice(0, -2);
          if (stem.length > 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
            return stem.slice(0, -1);
          }
          return stem;
        }
        if (word.endsWith('ly') && word.length > 4) return word.slice(0, -2);
        if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
        if (word.endsWith('s') && !word.endsWith('ss') && word.length > 4) return word.slice(0, -1);
        return word;
      };
      
      // Track original words for display (use most common form)
      const stemToOriginals: Record<string, Record<string, number>> = {};

      // Helper to extract keywords from text
      const extractKeywords = (text: string, keywords: Record<string, number>, stopWords: Set<string>) => {
        const words = text
          .toLowerCase()
          .replace(/[^a-z\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 3 && !stopWords.has(word));
        
        words.forEach(word => {
          const stem = stemWord(word);
          if (!stopWords.has(stem) && stem.length > 2) {
            keywords[stem] = (keywords[stem] || 0) + 1;
            // Track original word forms
            if (!stemToOriginals[stem]) stemToOriginals[stem] = {};
            stemToOriginals[stem][word] = (stemToOriginals[stem][word] || 0) + 1;
          }
        });
      };

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
          extractKeywords(note.text_content, keywords, stopWords);
        }
      });
      
      // Extract keywords from daily focus entries (this month)
      const thisMonthFocus = focusEntries.filter(entry => 
        parseISO(entry.created_at) >= thisMonthStart
      );
      thisMonthFocus.forEach(entry => {
        if (entry.focus_text) {
          extractKeywords(entry.focus_text, keywords, stopWords);
        }
      });
      
      // Extract keywords from saved focus backlog (this month)
      const thisMonthBacklog = backlogEntries.filter(entry => 
        parseISO(entry.saved_at) >= thisMonthStart
      );
      thisMonthBacklog.forEach(entry => {
        if (entry.focus_text) {
          extractKeywords(entry.focus_text, keywords, stopWords);
        }
      });

      const topKeywordsThisMonth = Object.entries(keywords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([stem, count]) => {
          // Use the most commonly seen original word form for display
          const originals = stemToOriginals[stem] || {};
          const displayWord = Object.entries(originals)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || stem;
          return { keyword: displayWord, count };
        });

      const topTagsThisMonth = Object.entries(tags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));

      // Update current_streak in profile and refresh cached data
      supabase
        .from('profiles')
        .update({ current_streak: currentStreak })
        .eq('id', profileId)
        .then(() => {
          // Refresh the auth context profile to update streak display
          refreshProfile();
          // Patch streak in cached notes data in-place (avoids full refetch cascade)
          queryClient.setQueriesData<any[]>(
            { queryKey: ['notes'] },
            (oldData) => {
              if (!oldData) return oldData;
              return oldData.map((note: any) =>
                note.author?.id === profileId
                  ? { ...note, author: { ...note.author, current_streak: currentStreak } }
                  : note
              );
            }
          );
          queryClient.setQueriesData<any[]>(
            { queryKey: ['friends-notes'] },
            (oldData) => {
              if (!oldData) return oldData;
              return oldData.map((note: any) =>
                note.author?.id === profileId
                  ? { ...note, author: { ...note.author, current_streak: currentStreak } }
                  : note
              );
            }
          );
        });

      // Build daily minutes map for calendar heatmap (from all sessionsWithDuration, which now covers 365 days)
      const dailyMinutesMap: Record<string, number> = {};
      sessionsWithDuration.forEach(s => {
        const dayKey = format(s.startDate, 'yyyy-MM-dd');
        dailyMinutesMap[dayKey] = (dailyMinutesMap[dayKey] || 0) + s.durationMinutes;
      });

      // Best day (most minutes in a single day) — derived from dailyMinutesMap, no new query
      let bestDayMinutes: { date: string; minutes: number } | null = null;
      for (const [date, mins] of Object.entries(dailyMinutesMap)) {
        if (!bestDayMinutes || mins > bestDayMinutes.minutes) {
          bestDayMinutes = { date, minutes: mins };
        }
      }

      // Monthly totals — derived from sessionsWithDuration, no new query
      const monthlyTotals: Record<string, number> = {};
      sessionsWithDuration.forEach(s => {
        const monthKey = format(s.startDate, 'yyyy-MM');
        monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + s.durationMinutes;
      });

      // Best month
      let bestMonthMinutes: { month: string; minutes: number } | null = null;
      for (const [month, mins] of Object.entries(monthlyTotals)) {
        if (!bestMonthMinutes || mins > bestMonthMinutes.minutes) {
          bestMonthMinutes = { month, minutes: mins };
        }
      }

      // Last month total
      const lastMonthKey = format(subMonths(now, 1), 'yyyy-MM');
      const lastMonthTotal = monthlyTotals[lastMonthKey] || 0;

      const totalNotesCount = notesCountResult.count ?? 0;
      const notesLast30Days = notesLast30Result.count ?? 0;

      // Extract weekly focus averages from F=N tags in notes (no new query)
      const weeklyFocusMap: Record<string, number[]> = {};
      notes.forEach(note => {
        if (!note.tags) return;
        const fTag = note.tags.find(t => /^F=[1-5]$/.test(t));
        if (!fTag) return;
        const level = parseInt(fTag.charAt(2), 10);
        const noteDate = parseISO(note.created_at);
        const weekKey = format(startOfWeek(noteDate, { weekStartsOn: 1 }), 'MMM d');
        if (!weeklyFocusMap[weekKey]) weeklyFocusMap[weekKey] = [];
        weeklyFocusMap[weekKey].push(level);
      });
      // Build array aligned to same 52-week window as weeklyMinutesOverTime
      const weeklyFocusAverage: { week: string; average: number }[] = [];
      for (let i = 51; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'MMM d');
        const levels = weeklyFocusMap[weekKey];
        if (levels && levels.length > 0) {
          weeklyFocusAverage.push({ week: weekKey, average: Math.round((levels.reduce((s, v) => s + v, 0) / levels.length) * 10) / 10 });
        } else {
          weeklyFocusAverage.push({ week: weekKey, average: 0 });
        }
      }

      // Consistency: best month days practiced
      const monthDaysMap: Record<string, number> = {};
      for (const date of Object.keys(dailyMinutesMap)) {
        if (dailyMinutesMap[date] > 0) {
          const monthKey = date.slice(0, 7); // yyyy-MM
          monthDaysMap[monthKey] = (monthDaysMap[monthKey] || 0) + 1;
        }
      }
      const bestMonthDays = Math.max(0, ...Object.values(monthDaysMap));

      // Consistency: best completed calendar year practice %
      // Only consider fully completed years (not current year)
      const currentYear = now.getFullYear();
      const yearDaysMap: Record<number, number> = {};
      for (const date of Object.keys(dailyMinutesMap)) {
        if (dailyMinutesMap[date] > 0) {
          const year = parseInt(date.slice(0, 4), 10);
          if (year < currentYear) {
            yearDaysMap[year] = (yearDaysMap[year] || 0) + 1;
          }
        }
      }
      let bestCompletedYearPct = 0;
      for (const [yearStr, days] of Object.entries(yearDaysMap)) {
        const year = parseInt(yearStr, 10);
        const daysInYear = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
        const pct = Math.round((days / daysInYear) * 100);
        if (pct > bestCompletedYearPct) bestCompletedYearPct = pct;
      }

      return {
        sessionsThisWeek,
        sessionsThisMonth,
        totalMinutesThisWeek,
        totalMinutesThisMonth,
        weeklyMinutesOverTime,
        weeklyDaysPracticed,
        currentStreak,
        bestDailyStreak,
        bestWeekMinutes,
        bestDayMinutes,
        bestMonthMinutes,
        lastMonthTotal,
        topKeywordsThisMonth,
        topTagsThisMonth,
        dailyMinutesMap,
        totalNotesCount,
        notesLast30Days,
        totalAllTimeMinutes: sessionsWithDuration.reduce((sum, s) => sum + s.durationMinutes, 0),
        weeklyFocusAverage,
        bestMonthDays,
        bestCompletedYearPct,
      };
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Only retry once on failure
    retryDelay: 1000,
  });
}
