import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // User metrics
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: totalAIUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_ai', true);

    const { count: totalHumanUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_ai', false);

    // Active users (users who posted or commented in last 24h)
    const { data: recentPosts24h } = await supabase
      .from('posts')
      .select('author_id')
      .gte('created_at', oneDayAgo.toISOString());

    const { data: recentComments24h } = await supabase
      .from('comments')
      .select('author_id')
      .gte('created_at', oneDayAgo.toISOString());

    const activeUserIds24h = new Set([
      ...(recentPosts24h || []).map(p => p.author_id),
      ...(recentComments24h || []).map(c => c.author_id),
    ]);

    // Weekly active users
    const { data: recentPosts7d } = await supabase
      .from('posts')
      .select('author_id')
      .gte('created_at', sevenDaysAgo.toISOString());

    const { data: recentComments7d } = await supabase
      .from('comments')
      .select('author_id')
      .gte('created_at', sevenDaysAgo.toISOString());

    const activeUserIds7d = new Set([
      ...(recentPosts7d || []).map(p => p.author_id),
      ...(recentComments7d || []).map(c => c.author_id),
    ]);

    // Content metrics
    const { count: totalPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    const { count: postsToday } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo.toISOString());

    const { count: postsThisWeek } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    const { count: totalComments } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true });

    const { count: commentsToday } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo.toISOString());

    const { count: totalReactions } = await supabase
      .from('post_reactions')
      .select('*', { count: 'exact', head: true });

    const { count: reactionsToday } = await supabase
      .from('post_reactions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo.toISOString());

    // AI vs Human content in last 7 days
    const { data: postsWithAuthors } = await supabase
      .from('posts')
      .select('id, profiles!posts_author_id_fkey(is_ai)')
      .gte('created_at', sevenDaysAgo.toISOString());

    const aiPosts7d = postsWithAuthors?.filter(p => (p.profiles as any)?.is_ai).length || 0;
    const humanPosts7d = postsWithAuthors?.filter(p => !(p.profiles as any)?.is_ai).length || 0;

    const { data: commentsWithAuthors } = await supabase
      .from('comments')
      .select('id, profiles!comments_author_id_fkey(is_ai)')
      .gte('created_at', sevenDaysAgo.toISOString());

    const aiComments7d = commentsWithAuthors?.filter(c => (c.profiles as any)?.is_ai).length || 0;
    const humanComments7d = commentsWithAuthors?.filter(c => !(c.profiles as any)?.is_ai).length || 0;

    // Top tags by post count
    const { data: allPostTags } = await supabase
      .from('posts')
      .select('tags')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const tagCounts: Record<string, number> = {};
    for (const post of allPostTags || []) {
      for (const tag of post.tags || []) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // Most engaged posts (by reactions + comments)
    const { data: topEngagedPosts } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        comment_count,
        created_at,
        profiles!posts_author_id_fkey(name, username, is_ai)
      `)
      .order('comment_count', { ascending: false })
      .limit(10);

    // Get reaction counts for top posts
    const engagedPostsWithReactions = await Promise.all(
      (topEngagedPosts || []).map(async (post) => {
        const { count: reactionCount } = await supabase
          .from('post_reactions')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        return {
          id: post.id,
          content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
          author: (post.profiles as any)?.name || 'Unknown',
          username: (post.profiles as any)?.username || 'unknown',
          isAI: (post.profiles as any)?.is_ai || false,
          commentCount: post.comment_count,
          reactionCount: reactionCount || 0,
          engagement: (post.comment_count || 0) + (reactionCount || 0),
          createdAt: post.created_at,
        };
      })
    );

    // Sort by total engagement
    engagedPostsWithReactions.sort((a, b) => b.engagement - a.engagement);

    // Moderation flags
    const { count: pendingFlags } = await supabase
      .from('moderation_flags')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: totalFlags } = await supabase
      .from('moderation_flags')
      .select('*', { count: 'exact', head: true });

    // Post type distribution
    const { data: postsByType } = await supabase
      .from('posts')
      .select('post_type')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const postTypeCounts: Record<string, number> = {};
    for (const post of postsByType || []) {
      postTypeCounts[post.post_type] = (postTypeCounts[post.post_type] || 0) + 1;
    }

    const analytics = {
      users: {
        total: totalUsers || 0,
        ai: totalAIUsers || 0,
        human: totalHumanUsers || 0,
        activeDaily: activeUserIds24h.size,
        activeWeekly: activeUserIds7d.size,
      },
      content: {
        totalPosts: totalPosts || 0,
        postsToday: postsToday || 0,
        postsThisWeek: postsThisWeek || 0,
        totalComments: totalComments || 0,
        commentsToday: commentsToday || 0,
        totalReactions: totalReactions || 0,
        reactionsToday: reactionsToday || 0,
      },
      aiVsHuman: {
        posts: {
          ai: aiPosts7d,
          human: humanPosts7d,
          aiPercentage: ((aiPosts7d / (aiPosts7d + humanPosts7d || 1)) * 100).toFixed(1),
        },
        comments: {
          ai: aiComments7d,
          human: humanComments7d,
          aiPercentage: ((aiComments7d / (aiComments7d + humanComments7d || 1)) * 100).toFixed(1),
        },
      },
      engagement: {
        topTags,
        topPosts: engagedPostsWithReactions.slice(0, 5),
        postTypeDistribution: postTypeCounts,
      },
      moderation: {
        pendingFlags: pendingFlags || 0,
        totalFlags: totalFlags || 0,
      },
      generatedAt: now.toISOString(),
    };

    return new Response(
      JSON.stringify(analytics),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analytics error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
