import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, Calendar, Hash, Flame, Trophy, Zap, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getStreakTier, getStreakMilestoneMessage, STREAK_TIERS } from '@/lib/streakUtils';

interface PracticeStatsProps {
  profileId: string;
}

export function PracticeStats({ profileId }: PracticeStatsProps) {
  const { data: stats, isLoading, error, isFetching } = usePracticeStats(profileId);

  // Show error state with retry option
  if (error) {
    return (
      <Card className="p-4 bg-card border-border">
        <p className="text-sm text-muted-foreground text-center">
          Unable to load stats. Pull down to refresh.
        </p>
      </Card>
    );
  }

  if (isLoading && !stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full animate-pulse" />
        <Skeleton className="h-32 w-full animate-pulse" />
        <Skeleton className="h-48 w-full animate-pulse" />
        <Skeleton className="h-32 w-full animate-pulse" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  };

  return (
    <div className="space-y-4">
      {/* Section 1: Number of sessions */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Number of sessions</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{stats.sessionsThisWeek}</p>
            <p className="text-xs text-muted-foreground">This week</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.sessionsThisMonth}</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </div>
        </div>
      </Card>

      {/* Section 2: Minutes practiced */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Minutes practiced</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{formatMinutes(stats.totalMinutesThisWeek)}</p>
            <p className="text-xs text-muted-foreground">This week</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{formatMinutes(stats.totalMinutesThisMonth)}</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </div>
        </div>
      </Card>

      {/* Section 3: Progress */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Progress</h3>
        </div>
        
        {/* Line Chart */}
        <p className="text-sm text-muted-foreground mb-2">Minutes practiced per week</p>
        <div className="h-40 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.weeklyMinutesOverTime}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="week" 
                tick={{ fontSize: 10 }} 
                className="text-muted-foreground"
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                className="text-muted-foreground"
                tickLine={false}
                width={30}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`${formatMinutes(value)}`, 'Practice time']}
              />
              <Line 
                type="monotone" 
                dataKey="minutes" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Current Streak, Best Streak & Best Week */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg bg-muted/50 text-center">
            <Zap className={`w-4 h-4 sm:w-5 sm:h-5 mb-1 ${getStreakTier(stats.currentStreak).colorClass || 'text-green-500'}`} />
            <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.currentStreak}d</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Streak</p>
          </div>
          <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg bg-muted/50 text-center">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 mb-1" />
            <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.bestDailyStreak}d</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Best</p>
          </div>
          <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg bg-muted/50 text-center">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 mb-1" />
            <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.bestWeekMinutes ? formatMinutes(stats.bestWeekMinutes.minutes) : '0m'}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Top Wk</p>
          </div>
        </div>

        {/* Streak Milestones */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Award className="w-4 h-4" />
            <span>Streak Recognition</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {STREAK_TIERS.filter(t => t.tier !== 'none').map((tier) => {
              const achieved = stats.currentStreak >= tier.minDays;
              return (
                <div 
                  key={tier.tier}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    achieved 
                      ? `${tier.bgColorClass} ${tier.colorClass} font-medium` 
                      : 'bg-muted/30 text-muted-foreground/60'
                  }`}
                >
                  <span>{tier.minDays}d</span>
                  <span className="capitalize">{tier.label}</span>
                  {achieved && <span>✓</span>}
                </div>
              );
            })}
          </div>
          {getStreakMilestoneMessage(stats.currentStreak) && (
            <p className="text-xs text-muted-foreground italic mt-1">
              {getStreakMilestoneMessage(stats.currentStreak)}
            </p>
          )}
        </div>
      </Card>

      {/* Section 4: Themes */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Themes</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Themes are based on words and phrases you write in your practice notes.
        </p>
        
        <div className="space-y-4">
          {/* Keywords from text content */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Top words this month</p>
            <div className="flex flex-wrap gap-2">
              {stats.topKeywordsThisMonth.length > 0 ? (
                stats.topKeywordsThisMonth.map(({ keyword, count }) => (
                  <Badge key={keyword} variant="secondary" className="text-xs">
                    {keyword} ({count})
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No keywords yet</p>
              )}
            </div>
          </div>
          
          {/* Tags frequency */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Top tags this month</p>
            <div className="flex flex-wrap gap-2">
              {stats.topTagsThisMonth.length > 0 ? (
                stats.topTagsThisMonth.map(({ tag, count }) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag} ({count})
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No tags yet</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
