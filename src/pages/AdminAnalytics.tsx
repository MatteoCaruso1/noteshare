import { useState, useCallback } from 'react';
import { useAnalytics, PremiumUser, NoteActivatedUser, FriendCountUser, TryProClickUser, MobileSessionUser, FunnelUser } from '@/hooks/useAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, TrendingUp, AlertCircle, RefreshCw, CreditCard, Repeat, HelpCircle, ChevronDown, ChevronUp, Crown, Music, UserPlus, Star, Smartphone, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, BarChart, Bar } from 'recharts';
import { format, parseISO } from 'date-fns';

const PREVIEW_COUNT = 5;
const METRIC_DEFINITIONS = {
  noteActivatedUsers: "Users who created at least one Note on a given day. This measures daily active engagement with the core feature.",
  activationRate: "Percentage of users who visited the Practice page and then created a Note. Formula: (Note Creators / Practice Page Viewers) × 100",
  day7Retention: "Of users who created their first Note on a given date, what percentage returned to create another Note exactly 7 days later.",
  activePremium: "Total users with premium access, including those in trial period and those actively paying.",
  trialToPaid: "Of users whose trial ended in the last 7 days, what percentage converted to a paid subscription.",
};

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  definition: string;
  value: string | number;
  subtitle: string;
}

const MetricCard = ({ icon, title, definition, value, subtitle }: MetricCardProps) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription className="flex items-center gap-2">
        {icon}
        <span>{title}</span>
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px] text-sm">
              {definition}
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </CardContent>
  </Card>
);

const getTypeBadgeVariant = (type: PremiumUser['type']) => {
  switch (type) {
    case 'subscription': return 'default';
    case 'lifetime': return 'secondary';
    case 'trial': return 'outline';
    case 'override': return 'secondary';
    default: return 'outline';
  }
};

const getTypeLabel = (type: PremiumUser['type']) => {
  switch (type) {
    case 'subscription': return 'Monthly';
    case 'lifetime': return 'Lifetime';
    case 'trial': return 'Trial';
    case 'override': return 'Override';
    default: return type;
  }
};

// Generic user list component
interface UserListProps<T> {
  users: T[];
  icon: React.ReactNode;
  title: string;
  description: string;
  renderBadge: (user: T) => React.ReactNode;
}

function UserList<T extends { name: string; username?: string }>({ users, icon, title, description, renderBadge }: UserListProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const hasMore = users.length > PREVIEW_COUNT;
  const displayUsers = isOpen ? users : users.slice(0, PREVIEW_COUNT);

  if (users.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title} ({users.length})
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayUsers.map((user, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex flex-col">
                <span className="font-medium">{user.name}</span>
                {user.username && (
                  <span className="text-sm text-muted-foreground">@{user.username}</span>
                )}
              </div>
              {renderBadge(user)}
            </div>
          ))}
        </div>
        {hasMore && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm text-primary mt-3 hover:underline">
              {isOpen ? (
                <>Show less <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Show all {users.length} users <ChevronDown className="w-4 h-4" /></>
              )}
            </CollapsibleTrigger>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

// Funnel visualization
function AccountFunnelCard({ funnel, days }: { funnel: NonNullable<ReturnType<typeof useAnalytics>['data']>['accountFunnel']; days: number }) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const steps = [
    { key: 'accounts', label: 'Accounts Created', count: funnel.accountsCreated, users: funnel.accountUsers },
    { key: '1plus', label: '1+ Notes', count: funnel.with1PlusNotes, users: funnel.note1PlusUsers },
    { key: '5plus', label: '5+ Notes', count: funnel.with5PlusNotes, users: funnel.note5PlusUsers },
  ];

  const total = funnel.accountsCreated || 1;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Account Funnel
        </CardTitle>
        <CardDescription>
          Accounts created in the last {days} days → note engagement. Click any step to see users.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, i) => {
            const pct = Math.round((step.count / total) * 100);
            const widthPct = Math.max(pct, 8);
            const isExpanded = expandedStep === step.key;

            return (
              <div key={step.key}>
                <button
                  onClick={() => setExpandedStep(isExpanded ? null : step.key)}
                  className="w-full text-left group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{step.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {step.count} <span className="text-xs">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-8 overflow-hidden">
                    <div
                      className="h-full bg-primary/80 rounded-full flex items-center justify-center transition-all group-hover:bg-primary"
                      style={{ width: `${widthPct}%` }}
                    >
                      <span className="text-xs font-semibold text-primary-foreground">
                        {step.count}
                      </span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-2 ml-2 border-l-2 border-primary/20 pl-3 max-h-[300px] overflow-y-auto">
                    {step.users.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No users</p>
                    ) : (
                      <div className="space-y-1.5">
                        {step.users.map((u, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{u.name}</span>
                              <span className="text-xs text-muted-foreground">@{u.username}</span>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-xs">{u.noteCount} notes</Badge>
                              <Badge variant="outline" className="text-xs">{u.friendCount} friends</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface DrilldownUser { name: string; username: string; }
interface DrilldownData { date: string; viewers: DrilldownUser[]; creators: DrilldownUser[]; }

const AdminAnalytics = () => {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useAnalytics(days);
  const [drilldown, setDrilldown] = useState<DrilldownData | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const handleActivationChartClick = useCallback(async (chartData: any) => {
    if (!chartData?.activePayload?.[0]?.payload?.date) return;
    const date = chartData.activePayload[0].payload.date;
    setDrilldownLoading(true);
    setDrilldown(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-analytics?drilldown_date=${date}`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setDrilldown(data);
      }
    } catch (e) {
      console.error('Drilldown fetch error:', e);
    } finally {
      setDrilldownLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-destructive">
          <AlertCircle className="w-8 h-8" />
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Get latest values for metric cards
  const latestDailyCount = data.noteActivatedUsers.dailyCounts[data.noteActivatedUsers.dailyCounts.length - 1];
  const latestRollingAvg = data.noteActivatedUsers.rollingAverage7d[data.noteActivatedUsers.rollingAverage7d.length - 1];
  const latestActivationRate = data.noteActivationRate.dailyRates[data.noteActivationRate.dailyRates.length - 1];

  // Format data for charts
  const noteUsersChartData = data.noteActivatedUsers.dailyCounts.map((item, index) => ({
    date: item.date,
    count: item.count,
    average: data.noteActivatedUsers.rollingAverage7d[index]?.average || 0,
  }));

  const activationRateChartData = data.noteActivationRate.dailyRates.map((item) => ({
    date: item.date,
    viewers: item.viewers,
    creators: item.creators,
    rate: item.rate,
  }));

  // Day 7 retention chart data - filter to only show cohorts that have reached day 7
  const retentionChartData = data.day7Retention.dailyRates
    .filter((item) => {
      const cohortDate = new Date(item.date);
      const today = new Date();
      const daysSinceCohort = Math.floor((today.getTime() - cohortDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceCohort >= 7 && item.cohortSize > 0;
    })
    .map((item) => ({
      date: item.date,
      cohortSize: item.cohortSize,
      retained: item.retained,
      rate: item.rate,
    }));

  const formatXAxis = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d');
    } catch {
      return dateStr;
    }
  };

  const formatTooltipLabel = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-16">
      <div className="container mx-auto px-4 pt-4 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Product Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Core metrics for Noteshare engagement
            </p>
          </div>
          <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="99999">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Engagement Metric Cards (Row 1) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <MetricCard
            icon={<Users className="w-4 h-4" />}
            title="Note-activated Users (Today)"
            definition={METRIC_DEFINITIONS.noteActivatedUsers}
            value={latestDailyCount?.count || 0}
            subtitle={`7-day avg: ${latestRollingAvg?.average || 0}`}
          />

          <MetricCard
            icon={<TrendingUp className="w-4 h-4" />}
            title="Activation Rate (Today)"
            definition={METRIC_DEFINITIONS.activationRate}
            value={`${latestActivationRate?.rate || 0}%`}
            subtitle={`${latestActivationRate?.creators || 0} of ${latestActivationRate?.viewers || 0} viewers`}
          />

          <MetricCard
            icon={<RefreshCw className="w-4 h-4" />}
            title="Day 7 Retention"
            definition={METRIC_DEFINITIONS.day7Retention}
            value={data.day7Retention.today.rate !== null ? `${data.day7Retention.today.rate}%` : 'N/A'}
            subtitle={data.day7Retention.today.cohortSize > 0 
              ? `${data.day7Retention.today.retained} of ${data.day7Retention.today.cohortSize} users returned`
              : 'No cohort from 7 days ago'}
          />
        </div>

        {/* Subscription Metric Cards (Row 2) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <MetricCard
            icon={<CreditCard className="w-4 h-4" />}
            title="Active Premium"
            definition={METRIC_DEFINITIONS.activePremium}
            value={data.paidConversion.totalActive}
            subtitle={`${data.paidConversion.inTrial} trial, ${data.paidConversion.actuallyPaying} paying`}
          />

          <MetricCard
            icon={<Repeat className="w-4 h-4" />}
            title="Trial → Paid (7 days)"
            definition={METRIC_DEFINITIONS.trialToPaid}
            value={data.trialToPaidRate.trialsEndedLast7Days > 0 ? `${data.trialToPaidRate.rate}%` : 'N/A'}
            subtitle={data.trialToPaidRate.trialsEndedLast7Days > 0
              ? `${data.trialToPaidRate.converted} of ${data.trialToPaidRate.trialsEndedLast7Days} converted`
              : 'No trials ended in last 7 days'}
          />

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Data Range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {data.metadata.startDate && formatTooltipLabel(data.metadata.startDate)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Updated: {format(parseISO(data.metadata.generatedAt), 'h:mm a')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Account Funnel */}
        {data.accountFunnel && <AccountFunnelCard funnel={data.accountFunnel} days={days} />}

      {/* Metric 1: Note-activated Users Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Note-activated Users
          </CardTitle>
          <CardDescription>
            Unique users who created at least one Note per day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={noteUsersChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatXAxis}
                  className="text-xs"
                />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip 
                  labelFormatter={formatTooltipLabel}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  name="Daily Count"
                />
                <Line 
                  type="monotone" 
                  dataKey="average" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="7-day Rolling Avg"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Metric 2: Note-activation Rate Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            User Note-activation Rate
          </CardTitle>
          <CardDescription>
            Percentage of Practice page viewers who created a Note
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activationRateChartData} onClick={handleActivationChartClick} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatXAxis}
                  className="text-xs"
                />
                <YAxis 
                  yAxisId="left"
                  allowDecimals={false} 
                  className="text-xs"
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => `${value}%`}
                  className="text-xs"
                />
                <Tooltip 
                  labelFormatter={formatTooltipLabel}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Activation Rate') return [`${value}%`, name];
                    return [value, name];
                  }}
                />
                <Legend />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="viewers" 
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted))"
                  name="Viewers"
                />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="creators" 
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.3)"
                  name="Note Creators"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="rate" 
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                  name="Activation Rate"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Note: Page view tracking started on deployment. Historical data may be incomplete.
          </p>
        </CardContent>
      </Card>

      {/* Metric 3: Day 7 Retention Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Day 7 Core Retention
          </CardTitle>
          <CardDescription>
            Users who created their first Note and returned 7 days later
          </CardDescription>
        </CardHeader>
        <CardContent>
          {retentionChartData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={retentionChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatXAxis}
                    className="text-xs"
                  />
                  <YAxis 
                    yAxisId="left"
                    allowDecimals={false} 
                    className="text-xs"
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => `${value}%`}
                    className="text-xs"
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    labelFormatter={(dateStr) => `Cohort: ${formatTooltipLabel(dateStr)}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Retention Rate') return [`${value}%`, name];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="cohortSize" 
                    fill="hsl(var(--muted))"
                    name="Cohort Size"
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="retained" 
                    fill="hsl(var(--primary))"
                    name="Retained"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="rate" 
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={true}
                    name="Retention Rate"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground text-center">
                No retention data available yet.<br />
                Cohorts need 7+ days to measure retention.
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-4 text-center">
            X-axis shows cohort date (when users created their first Note). Each bar shows if they returned 7 days later.
          </p>
        </CardContent>
      </Card>

      {/* Premium Users List */}
      <UserList<PremiumUser>
        users={data.premiumUsers || []}
        icon={<Crown className="w-5 h-5" />}
        title="Premium Users"
        description="Users with active premium access"
        renderBadge={(user) => (
          <Badge variant={getTypeBadgeVariant(user.type)}>
            {getTypeLabel(user.type)}
          </Badge>
        )}
      />

      {/* Note-activated Users List (filtered by date range) */}
      <UserList<NoteActivatedUser>
        users={data.noteActivatedUsers.users || []}
        icon={<Music className="w-5 h-5" />}
        title="Note-activated Users"
        description={`Users who created at least one note in the last ${days} days`}
        renderBadge={(user) => (
          <Badge variant="outline">{user.noteCount} notes</Badge>
        )}
      />

      {/* Friends Count by Account */}
      <UserList<FriendCountUser>
        users={data.friendCountUsers || []}
        icon={<UserPlus className="w-5 h-5" />}
        title="Friends by Account"
        description="Number of accepted friendships per user"
        renderBadge={(user) => (
          <Badge variant="outline">{user.friendCount} friends</Badge>
        )}
      />

      {/* Try Pro Clicks by Account */}
      <UserList<TryProClickUser>
        users={data.tryProClickUsers || []}
        icon={<Star className="w-5 h-5" />}
        title="Try Pro Clicks"
        description="Lifetime count of times each user opened the Pro dialog"
        renderBadge={(user) => (
          <Badge variant="outline">{user.clickCount} clicks</Badge>
        )}
      />

      {/* Mobile Session Percentage by Account */}
      <UserList<MobileSessionUser>
        users={data.mobileSessionUsers || []}
        icon={<Smartphone className="w-5 h-5" />}
        title="Mobile vs Total Sessions"
        description="Percentage of practice sessions started on mobile (since Feb 25 tracking)"
        renderBadge={(user) => (
          <Badge variant="outline">{user.mobilePercent}% mobile ({user.mobileCount}/{user.totalCount})</Badge>
        )}
      />

      </div>
    </div>
  );
};

export default AdminAnalytics;
