import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, subWeeks, subMonths, differenceInMinutes, parseISO, format, startOfMonth, subDays, isWithinInterval, differenceInDays } from 'date-fns';

interface PracticeStats {
  // Habit & Consistency
  sessionsLastWeek: number;
  weeklyAverageLastMonth: number;
  weeklyAverageLast3Months: number;
  
  // Volume
  totalMinutesLastWeek: number;
  avgWeeklyMinutesLastMonth: number;
  avgWeeklyMinutesLast3Months: number;
  
  // Progress
  weeklyMinutesOverTime: { week: string; minutes: number }[];
  bestDailyStreak: number;
  bestWeekMinutes: { week: string; minutes: number } | null;
  
  // Themes
  topKeywordsThisMonth: { keyword: string; count: number }[];
  topKeywordsLastMonth: { keyword: string; count: number }[];
}

export function usePracticeStats(profileId: string | undefined) {
  return useQuery({
    queryKey: ['practice-stats', profileId],
    queryFn: async (): Promise<PracticeStats> => {
      if (!profileId) throw new Error('Profile ID required');

      const now = new Date();
      const threeMonthsAgo = subMonths(now, 3);

      // Fetch all sessions from last 3 months
      const { data: sessions, error: sessionsError } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', profileId)
        .gte('started_at', threeMonthsAgo.toISOString())
        .order('started_at', { ascending: true });

      if (sessionsError) throw sessionsError;

      // Fetch all notes from last 3 months for keyword analysis
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('text_content, tags, created_at')
        .eq('author_id', profileId)
        .gte('created_at', threeMonthsAgo.toISOString());

      if (notesError) throw notesError;

      // Calculate session durations
      const sessionsWithDuration = (sessions || []).map(session => {
        const start = parseISO(session.started_at);
        const end = session.ended_at ? parseISO(session.ended_at) : now;
        const durationMinutes = Math.max(0, differenceInMinutes(end, start));
        return { ...session, durationMinutes, startDate: start };
      });

      // Habit & Consistency
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });

      const sessionsLastWeek = sessionsWithDuration.filter(s => 
        isWithinInterval(s.startDate, { start: lastWeekStart, end: now })
      ).length;

      // Weekly averages
      const oneMonthAgo = subMonths(now, 1);
      const sessionsLastMonth = sessionsWithDuration.filter(s => s.startDate >= oneMonthAgo);
      const weeksInMonth = 4;
      const weeklyAverageLastMonth = Math.round(sessionsLastMonth.length / weeksInMonth * 10) / 10;

      const weeksIn3Months = 13;
      const weeklyAverageLast3Months = Math.round(sessionsWithDuration.length / weeksIn3Months * 10) / 10;

      // Volume
      const totalMinutesLastWeek = sessionsWithDuration
        .filter(s => isWithinInterval(s.startDate, { start: lastWeekStart, end: now }))
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      const totalMinutesLastMonth = sessionsLastMonth.reduce((sum, s) => sum + s.durationMinutes, 0);
      const avgWeeklyMinutesLastMonth = Math.round(totalMinutesLastMonth / weeksInMonth);

      const totalMinutes3Months = sessionsWithDuration.reduce((sum, s) => sum + s.durationMinutes, 0);
      const avgWeeklyMinutesLast3Months = Math.round(totalMinutes3Months / weeksIn3Months);

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

      // Daily streak calculation
      const sessionDates = new Set(
        sessionsWithDuration.map(s => format(s.startDate, 'yyyy-MM-dd'))
      );
      
      let bestDailyStreak = 0;
      let currentStreak = 0;
      
      for (let i = 90; i >= 0; i--) {
        const checkDate = format(subDays(now, i), 'yyyy-MM-dd');
        if (sessionDates.has(checkDate)) {
          currentStreak++;
          bestDailyStreak = Math.max(bestDailyStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }

      // Keyword extraction
      const extractKeywords = (notesList: typeof notes, startDate: Date, endDate: Date) => {
        const keywords: Record<string, number> = {};
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'i', 'my', 'me', 'we', 'our', 'you', 'your', 'it', 'its', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'would', 'could', 'should', 'might', 'must', 'shall', 'today', 'session', 'practice', 'practiced', 'working', 'worked']);

        (notesList || [])
          .filter(note => {
            const noteDate = parseISO(note.created_at);
            return isWithinInterval(noteDate, { start: startDate, end: endDate });
          })
          .forEach(note => {
            // Extract from tags
            (note.tags || []).forEach(tag => {
              const lowerTag = tag.toLowerCase().trim();
              if (lowerTag.length > 2 && !stopWords.has(lowerTag)) {
                keywords[lowerTag] = (keywords[lowerTag] || 0) + 2; // Tags weighted more
              }
            });
            
            // Extract from text content
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

        return Object.entries(keywords)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([keyword, count]) => ({ keyword, count }));
      };

      const thisMonthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = subDays(thisMonthStart, 1);

      const topKeywordsThisMonth = extractKeywords(notes || [], thisMonthStart, now);
      const topKeywordsLastMonth = extractKeywords(notes || [], lastMonthStart, lastMonthEnd);

      return {
        sessionsLastWeek,
        weeklyAverageLastMonth,
        weeklyAverageLast3Months,
        totalMinutesLastWeek,
        avgWeeklyMinutesLastMonth,
        avgWeeklyMinutesLast3Months,
        weeklyMinutesOverTime,
        bestDailyStreak,
        bestWeekMinutes,
        topKeywordsThisMonth,
        topKeywordsLastMonth,
      };
    },
    enabled: !!profileId,
  });
}
