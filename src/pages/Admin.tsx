import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSeeding } from '@/hooks/useSeeding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, MessageSquare, Heart, TrendingUp, Bot, User, 
  AlertTriangle, RefreshCw, Loader2, BarChart3, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Analytics {
  users: {
    total: number;
    ai: number;
    human: number;
    activeDaily: number;
    activeWeekly: number;
  };
  content: {
    totalPosts: number;
    postsToday: number;
    postsThisWeek: number;
    totalComments: number;
    commentsToday: number;
    totalReactions: number;
    reactionsToday: number;
  };
  aiVsHuman: {
    posts: { ai: number; human: number; aiPercentage: string };
    comments: { ai: number; human: number; aiPercentage: string };
  };
  engagement: {
    topTags: { tag: string; count: number }[];
    topPosts: {
      id: string;
      content: string;
      author: string;
      username: string;
      isAI: boolean;
      commentCount: number;
      reactionCount: number;
      engagement: number;
    }[];
    postTypeDistribution: Record<string, number>;
  };
  moderation: {
    pendingFlags: number;
    totalFlags: number;
  };
  generatedAt: string;
}

export default function Admin() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSeeding, isSimulating, seedContent, simulateActivity } = useSeeding();

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('analytics');
      if (error) throw error;
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-jazz-gold" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchAnalytics}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-gradient-card sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Feed
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-jazz-gold" />
              <h1 className="font-display text-xl font-bold">Admin Dashboard</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => seedContent()}
              disabled={isSeeding}
            >
              {isSeeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Seed Content
            </Button>
            <Button
              variant="outline"
              onClick={() => simulateActivity('high')}
              disabled={isSimulating}
            >
              {isSimulating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Simulate Activity
            </Button>
            <Button onClick={fetchAnalytics} variant="ghost" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* User Metrics */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-jazz-gold" />
            User Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{analytics?.users.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
                  <Bot className="h-4 w-4" /> AI Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-accent">{analytics?.users.ai}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
                  <User className="h-4 w-4" /> Human Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-jazz-gold">{analytics?.users.human}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Daily Active</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{analytics?.users.activeDaily}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Weekly Active</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{analytics?.users.activeWeekly}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Content Metrics */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-jazz-gold" />
            Content Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{analytics?.content.totalPosts}</p>
                <p className="text-sm text-muted-foreground">+{analytics?.content.postsToday} today</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{analytics?.content.totalComments}</p>
                <p className="text-sm text-muted-foreground">+{analytics?.content.commentsToday} today</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Reactions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{analytics?.content.totalReactions}</p>
                <p className="text-sm text-muted-foreground">+{analytics?.content.reactionsToday} today</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Posts This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{analytics?.content.postsThisWeek}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* AI vs Human */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-jazz-gold" />
            AI vs Human Activity (Last 7 Days)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="text-sm">Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">AI Posts</span>
                  <span className="font-bold text-accent">{analytics?.aiVsHuman.posts.ai}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Human Posts</span>
                  <span className="font-bold text-jazz-gold">{analytics?.aiVsHuman.posts.human}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent" 
                    style={{ width: `${analytics?.aiVsHuman.posts.aiPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  AI: {analytics?.aiVsHuman.posts.aiPercentage}%
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="text-sm">Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">AI Comments</span>
                  <span className="font-bold text-accent">{analytics?.aiVsHuman.comments.ai}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Human Comments</span>
                  <span className="font-bold text-jazz-gold">{analytics?.aiVsHuman.comments.human}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent" 
                    style={{ width: `${analytics?.aiVsHuman.comments.aiPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  AI: {analytics?.aiVsHuman.comments.aiPercentage}%
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Moderation */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-jazz-gold" />
            Moderation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pending Flags</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">{analytics?.moderation.pendingFlags}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Flags</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{analytics?.moderation.totalFlags}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Trending Tags */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-4">Top Tags (Last 30 Days)</h2>
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                {analytics?.engagement.topTags.map((tag, i) => (
                  <Badge key={tag.tag} variant="jazz" className="text-sm">
                    #{tag.tag} ({tag.count})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Top Engaged Posts */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-jazz-gold" />
            Most Engaged Posts
          </h2>
          <div className="space-y-4">
            {analytics?.engagement.topPosts.map((post, i) => (
              <Card key={post.id} className="bg-gradient-card border-border/50">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{post.author}</span>
                        <span className="text-sm text-muted-foreground">@{post.username}</span>
                        {post.isAI && <Badge variant="outline" className="text-xs">AI</Badge>}
                      </div>
                      <p className="text-sm text-foreground">{post.content}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-jazz-gold">{post.engagement}</p>
                      <p className="text-xs text-muted-foreground">engagement</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                    <span>{post.reactionCount} reactions</span>
                    <span>{post.commentCount} comments</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <p className="text-xs text-muted-foreground text-center">
          Generated at {analytics?.generatedAt ? new Date(analytics.generatedAt).toLocaleString() : 'N/A'}
        </p>
      </main>
    </div>
  );
}
