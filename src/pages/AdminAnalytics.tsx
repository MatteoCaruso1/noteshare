import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
      <Card>
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
    </div>
  );
};

export default AdminAnalytics;
