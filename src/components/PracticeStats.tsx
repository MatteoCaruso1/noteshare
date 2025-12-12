import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, Calendar, Hash, Flame, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PracticeStatsProps {
  profileId: string;
}

export function PracticeStats({ profileId }: PracticeStatsProps) {
  const { data: stats, isLoading, error } = usePracticeStats(profileId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !stats) {
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
      {/* Section 1: Habit & Consistency */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Habit & Consistency</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{stats.sessionsLastWeek}</p>
            <p className="text-xs text-muted-foreground">Sessions last week</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.weeklyAverageLastMonth}</p>
            <p className="text-xs text-muted-foreground">Avg/week (1 mo)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.weeklyAverageLast3Months}</p>
            <p className="text-xs text-muted-foreground">Avg/week (3 mo)</p>
          </div>
        </div>
      </Card>

      {/* Section 2: Volume */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Volume</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{formatMinutes(stats.totalMinutesLastWeek)}</p>
            <p className="text-xs text-muted-foreground">Last week</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{formatMinutes(stats.avgWeeklyMinutesLastMonth)}</p>
            <p className="text-xs text-muted-foreground">Avg/week (1 mo)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{formatMinutes(stats.avgWeeklyMinutesLast3Months)}</p>
            <p className="text-xs text-muted-foreground">Avg/week (3 mo)</p>
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

        {/* Streak & Best Week */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Flame className="w-6 h-6 text-orange-500" />
            <div>
              <p className="text-lg font-bold">{stats.bestDailyStreak} days</p>
              <p className="text-xs text-muted-foreground">Best streak</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="text-lg font-bold">{stats.bestWeekMinutes ? formatMinutes(stats.bestWeekMinutes.minutes) : '0m'}</p>
              <p className="text-xs text-muted-foreground">Best week</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 4: Themes */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Hash className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Themes</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">This month</p>
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
          
          <div>
            <p className="text-sm text-muted-foreground mb-2">Last month</p>
            <div className="flex flex-wrap gap-2">
              {stats.topKeywordsLastMonth.length > 0 ? (
                stats.topKeywordsLastMonth.map(({ keyword, count }) => (
                  <Badge key={keyword} variant="outline" className="text-xs">
                    {keyword} ({count})
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No keywords yet</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
