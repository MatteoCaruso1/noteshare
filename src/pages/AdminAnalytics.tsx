import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAnalytics, PremiumUser, NoteActivatedUser, FriendCountUser, TryProClickUser, MobileSessionUser, FunnelUser, AllUser } from '@/hooks/useAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, TrendingUp, AlertCircle, RefreshCw, CreditCard, Repeat, HelpCircle, ChevronDown, ChevronUp, Crown, Music, UserPlus, Star, Smartphone, Filter, Trash2, UserCheck, Mail, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, BarChart, Bar } from 'recharts';
import { Input } from '@/components/ui/input';
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

interface RecentAccount {
  id: string;
  user_id: string | null;
  name: string;
  username: string;
  created_at: string;
  has_logged_first_note: boolean;
  instruments: string[] | null;
  friendCount: number;
  noteCount: number;
}

const AdminAnalytics = () => {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useAnalytics(days);
  const [drilldown, setDrilldown] = useState<DrilldownData | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [recentAccounts, setRecentAccounts] = useState<RecentAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [filterHasNotes, setFilterHasNotes] = useState<'all' | 'yes' | 'no'>('all');
  const [filterFriends, setFilterFriends] = useState<'all' | '0' | '1+'>('all');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    const fetchRecentAccounts = async () => {
      setAccountsLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: accounts } = await supabase
        .from('profiles')
        .select('id, user_id, name, username, created_at, has_logged_first_note, instruments')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });

      if (!accounts) {
        setRecentAccounts([]);
        setAccountsLoading(false);
        return;
      }

      // Fetch friend counts and note counts for all these profile IDs
      const profileIds = accounts.map(a => a.id);
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(profileIds.map(id => `requester_id.eq.${id}`).join(',') + ',' + profileIds.map(id => `addressee_id.eq.${id}`).join(','));

      const friendCountMap: Record<string, number> = {};
      (friendships || []).forEach(f => {
        if (profileIds.includes(f.requester_id)) {
          friendCountMap[f.requester_id] = (friendCountMap[f.requester_id] || 0) + 1;
        }
        if (profileIds.includes(f.addressee_id)) {
          friendCountMap[f.addressee_id] = (friendCountMap[f.addressee_id] || 0) + 1;
        }
      });

      // Fetch note counts per author
      const noteCountMap: Record<string, number> = {};
      // Query notes for each profile in batches (author_id matches profile id)
      const { data: notesData } = await supabase
        .from('notes')
        .select('author_id')
        .in('author_id', profileIds);

      (notesData || []).forEach(n => {
        noteCountMap[n.author_id] = (noteCountMap[n.author_id] || 0) + 1;
      });

      setRecentAccounts(accounts.map(a => ({
        ...a,
        friendCount: friendCountMap[a.id] || 0,
        noteCount: noteCountMap[a.id] || 0,
      })));
      setAccountsLoading(false);
    };
    fetchRecentAccounts();
  }, []);

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

        {/* Engagement Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
            icon={<CreditCard className="w-4 h-4" />}
            title="Active Premium"
            definition={METRIC_DEFINITIONS.activePremium}
            value={data.paidConversion.totalActive}
            subtitle={`${data.paidConversion.inTrial} trial, ${data.paidConversion.actuallyPaying} paying`}
          />
        </div>

        {/* Account Funnel */}
        {data.accountFunnel && <AccountFunnelCard funnel={data.accountFunnel} days={days} />}

        {/* FTUE Funnel */}
        {data.ftueFunnel && data.ftueFunnel.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" />
                FTUE Step Funnel
              </CardTitle>
              <CardDescription>How many users reached each step of the 12-step onboarding flow (all time)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.ftueFunnel.map((s, i) => {
                  const maxUsers = data.ftueFunnel[0]?.users || 1;
                  const pct = maxUsers > 0 ? Math.round((s.users / maxUsers) * 100) : 0;
                  const stepLabels = [
                    'Tour: Practice btn', 'Tour: Quick note', 'Tour: Routine', 'Tour: Timeline',
                    'Tour: Open menu', 'Tour: Start session', 'Tour: Add notes', 'Tour: End session',
                    'Tour: Save dialog', 'Tour: Note created', 'Account created', 'Complete'
                  ];
                  return (
                    <div key={s.step} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">
                        {i}. {stepLabels[i] || `Step ${i}`}
                      </span>
                      <div className="flex-1 h-6 bg-muted rounded overflow-hidden relative">
                        <div
                          className="h-full bg-primary/70 rounded transition-all"
                          style={{ width: `${pct}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                          {s.users} ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        {/* Recent Accounts - right under funnel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Recent Accounts (Last 30 Days)
            </CardTitle>
            <CardDescription>
              {accountsLoading ? 'Loading...' : `${recentAccounts.length} accounts created`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {accountsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex gap-3 mb-4">
                  <Select value={filterHasNotes} onValueChange={(v) => setFilterHasNotes(v as 'all' | 'yes' | 'no')}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Has Notes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Notes</SelectItem>
                      <SelectItem value="yes">Has Notes</SelectItem>
                      <SelectItem value="no">No Notes</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterFriends} onValueChange={(v) => setFilterFriends(v as 'all' | '0' | '1+')}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Friends" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Friends</SelectItem>
                      <SelectItem value="0">0 Friends</SelectItem>
                      <SelectItem value="1+">1+ Friends</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="overflow-auto max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Note Count</TableHead>
                        <TableHead>Friends</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentAccounts
                        .filter(a => {
                          if (filterHasNotes === 'yes' && a.noteCount === 0) return false;
                          if (filterHasNotes === 'no' && a.noteCount > 0) return false;
                          if (filterFriends === '0' && a.friendCount > 0) return false;
                          if (filterFriends === '1+' && a.friendCount === 0) return false;
                          return true;
                        })
                        .map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell className="text-muted-foreground">@{account.username}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {format(parseISO(account.created_at), 'MMM d, yyyy h:mm a')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={account.noteCount > 0 ? 'default' : 'secondary'}>
                              {account.noteCount} {account.noteCount === 1 ? 'note' : 'notes'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{account.friendCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

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
            Percentage of Practice page viewers who created a Note · Click a data point to see who
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

      {/* Activation Rate Drilldown Dialog */}
      <Dialog open={!!drilldown || drilldownLoading} onOpenChange={(open) => { if (!open) { setDrilldown(null); setDrilldownLoading(false); } }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {drilldown ? format(parseISO(drilldown.date), 'MMMM d, yyyy') : 'Loading...'}
            </DialogTitle>
            <DialogDescription>
              Viewers & Note Creators for this day
            </DialogDescription>
          </DialogHeader>
          {drilldownLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : drilldown && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Viewers ({drilldown.viewers.length})
                </h4>
                <div className="space-y-1">
                  {drilldown.viewers.map((u, i) => (
                    <div key={i} className="text-sm flex items-center justify-between py-1 px-2 rounded-md bg-muted/50">
                      <span>{u.name}</span>
                      <span className="text-muted-foreground text-xs">@{u.username}</span>
                    </div>
                  ))}
                  {drilldown.viewers.length === 0 && <p className="text-sm text-muted-foreground">No viewers</p>}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  Note Creators ({drilldown.creators.length})
                </h4>
                <div className="space-y-1">
                  {drilldown.creators.map((u, i) => (
                    <div key={i} className="text-sm flex items-center justify-between py-1 px-2 rounded-md bg-primary/10">
                      <span>{u.name}</span>
                      <span className="text-muted-foreground text-xs">@{u.username}</span>
                    </div>
                  ))}
                  {drilldown.creators.length === 0 && <p className="text-sm text-muted-foreground">No creators</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


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

      {/* All Users with Email and Notes */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            All Users ({data.allUsers?.length || 0})
          </CardTitle>
          <CardDescription>Name, email, and total notes created</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.allUsers || [])
                  .filter(u => {
                    if (!userSearch) return true;
                    const q = userSearch.toLowerCase();
                    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
                  })
                  .map((user, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground">@{user.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{user.email || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={user.noteCount > 0 ? 'default' : 'secondary'}>{user.noteCount}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      </div>
    </div>
  );
};

export default AdminAnalytics;
