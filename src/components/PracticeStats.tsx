import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, Calendar, Hash, Flame, Trophy, Award, Palette, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemePicker } from '@/components/ThemePicker';
import { usePremium } from '@/contexts/PremiumContext';
import { useAuth } from '@/hooks/useAuth';

function ThemesUpgradePrompt() {
  const { openPremiumDialog } = usePremium();

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-4 px-6 text-center">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-jazz-gold/10">
        <Palette className="h-5 w-5 text-jazz-gold" />
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Upgrade to Pro to customize your theme
      </p>
      <Button 
        size="sm" 
        onClick={openPremiumDialog}
        variant="hero"
        className="gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Get Noteshare Pro
      </Button>
    </div>
  );
}

interface PracticeStatsProps {
  profileId: string;
}

export function PracticeStats({ profileId }: PracticeStatsProps) {
  const { data: stats, isLoading, error, isFetching } = usePracticeStats(profileId);
  const { isPremium } = usePremium();
  const { profile } = useAuth();

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

  // Set to true to show session/minutes stats cards
  const SHOW_SESSION_STATS = false;

  return (
    <div className="space-y-4">
      {/* Section 1: Number of sessions (hidden - set SHOW_SESSION_STATS to true to restore) */}
      {SHOW_SESSION_STATS && (
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
      )}

      {/* Section 2: Minutes practiced (hidden - set SHOW_SESSION_STATS to true to restore) */}
      {SHOW_SESSION_STATS && (
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
      )}

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
                width={36}
                tickFormatter={(value) => `${value}`}
                domain={[0, (dataMax: number) => {
                  // Calculate nice round tick interval
                  if (dataMax <= 60) return 60;
                  if (dataMax <= 120) return 120;
                  if (dataMax <= 180) return 180;
                  if (dataMax <= 240) return 240;
                  if (dataMax <= 300) return 300;
                  if (dataMax <= 360) return 360;
                  if (dataMax <= 480) return 480;
                  if (dataMax <= 600) return 600;
                  return Math.ceil(dataMax / 120) * 120;
                }]}
                ticks={(() => {
                  const maxMinutes = Math.max(...(stats.weeklyMinutesOverTime?.map(d => d.minutes) || [0]), 60);
                  let interval: number;
                  if (maxMinutes <= 60) interval = 30;
                  else if (maxMinutes <= 120) interval = 30;
                  else if (maxMinutes <= 240) interval = 60;
                  else if (maxMinutes <= 360) interval = 90;
                  else if (maxMinutes <= 480) interval = 120;
                  else interval = 120;
                  
                  const maxTick = Math.ceil(maxMinutes / interval) * interval;
                  const ticks = [];
                  for (let i = 0; i <= maxTick; i += interval) {
                    ticks.push(i);
                  }
                  return ticks;
                })()}
                interval={0}
                allowDecimals={false}
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

        {/* Days Practiced Per Week Line Chart */}
        <p className="text-sm text-muted-foreground mb-2">Days practiced per week</p>
        <div className="h-32 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.weeklyDaysPracticed}>
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
                width={24}
                domain={[0, 7]}
                ticks={[1, 3, 5, 7]}
                interval={0}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`${value} day${value !== 1 ? 's' : ''}`, 'Practiced']}
              />
              <Line 
                type="monotone" 
                dataKey="days" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg bg-muted/50 text-center">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 mb-1 text-primary" />
            <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.currentStreak}d</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Streak</p>
          </div>
          <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg bg-muted/50 text-center">
            <Award className="w-4 h-4 sm:w-5 sm:h-5 text-primary mb-1" />
            <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.bestDailyStreak}d</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Best</p>
          </div>
          <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg bg-muted/50 text-center">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-primary mb-1" />
            <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.bestWeekMinutes ? formatMinutes(stats.bestWeekMinutes.minutes) : '0m'}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Top Wk</p>
          </div>
        </div>
      </Card>

      {/* Section 4: Recent Focuses */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Recent Focuses</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Based on words from your practice notes and boards.
        </p>
        
        <div className="space-y-4">
          {/* Keywords from text content */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Top this month</p>
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
        </div>
      </Card>

      {/* Section 5: Color Themes */}
      {profile?.id === profileId && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-primary/60" />
            <h3 className="font-semibold">Themes</h3>
          </div>
          {isPremium ? (
            <ThemePicker />
          ) : (
            <ThemesUpgradePrompt />
          )}
        </Card>
      )}
    </div>
  );
}
