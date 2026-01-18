import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, TrendingUp, AlertCircle, RefreshCw, CreditCard, Repeat } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, BarChart, Bar } from 'recharts';
import { format, parseISO } from 'date-fns';

const AdminAnalytics = () => {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useAnalytics(days);

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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
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
          </SelectContent>
        </Select>
      </div>

      {/* Engagement Metric Cards (Row 1) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Note-activated Users (Today)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{latestDailyCount?.count || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">
              7-day avg: {latestRollingAvg?.average || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Activation Rate (Today)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{latestActivationRate?.rate || 0}%</div>
            <p className="text-sm text-muted-foreground mt-1">
              {latestActivationRate?.creators || 0} of {latestActivationRate?.viewers || 0} viewers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Day 7 Retention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.day7Retention.today.rate !== null 
                ? `${data.day7Retention.today.rate}%` 
                : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {data.day7Retention.today.cohortSize > 0 
                ? `${data.day7Retention.today.retained} of ${data.day7Retention.today.cohortSize} users returned`
                : 'No cohort from 7 days ago'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Metric Cards (Row 2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Active Premium
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.paidConversion.totalActive}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {data.paidConversion.inTrial} trial, {data.paidConversion.actuallyPaying} paying
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              Trial → Paid (7 days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.trialToPaidRate.trialsEndedLast7Days > 0 
                ? `${data.trialToPaidRate.rate}%` 
                : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {data.trialToPaidRate.trialsEndedLast7Days > 0
                ? `${data.trialToPaidRate.converted} of ${data.trialToPaidRate.trialsEndedLast7Days} converted`
                : 'No trials ended in last 7 days'}
            </p>
          </CardContent>
        </Card>

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
              <AreaChart data={activationRateChartData}>
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

      {/* Premium Breakdown Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Premium Breakdown
          </CardTitle>
          <CardDescription>
            Current subscription status across all accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="flex-1">
              <div className="h-8 rounded-full overflow-hidden flex bg-muted">
                {data.paidConversion.totalActive > 0 && (
                  <>
                    <div 
                      className="bg-primary h-full transition-all"
                      style={{ 
                        width: `${(data.paidConversion.actuallyPaying / data.paidConversion.totalActive) * 100}%` 
                      }}
                    />
                    <div 
                      className="bg-primary/40 h-full transition-all"
                      style={{ 
                        width: `${(data.paidConversion.inTrial / data.paidConversion.totalActive) * 100}%` 
                      }}
                    />
                  </>
                )}
              </div>
              <div className="flex justify-between mt-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span>Paying: {data.paidConversion.actuallyPaying}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary/40" />
                  <span>In Trial: {data.paidConversion.inTrial}</span>
                </div>
                <div className="text-muted-foreground">
                  Total: {data.paidConversion.totalActive}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
