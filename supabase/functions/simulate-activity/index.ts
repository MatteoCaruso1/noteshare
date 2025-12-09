import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ARTISTS = ['Miles Davis', 'John Coltrane', 'Charlie Parker', 'Thelonious Monk', 'Bill Evans', 'Herbie Hancock', 'Wayne Shorter', 'Art Blakey', 'Dizzy Gillespie', 'Sonny Rollins', 'Dexter Gordon', 'Cannonball Adderley', 'Lee Morgan', 'Freddie Hubbard', 'McCoy Tyner'];
const ALBUMS = ['Kind of Blue', 'A Love Supreme', 'Maiden Voyage', 'Blue Train', 'Moanin\'', 'Time Out', 'Mingus Ah Um', 'Somethin\' Else', 'Head Hunters', 'Bitches Brew'];
const TUNES = ['Giant Steps', 'Donna Lee', 'Confirmation', 'All The Things You Are', 'Autumn Leaves', 'Blue Bossa', 'So What', 'Impressions', 'Footprints', 'Nardis'];
const CONCEPTS = ['ii-V-I progressions', 'tritone substitutions', 'modal playing', 'bebop language', 'enclosures', 'chord tones'];
const STYLE_TAGS = ['bebop', 'hard-bop', 'cool-jazz', 'fusion', 'free-jazz', 'swing', 'contemporary', 'modal'];
const INSTRUMENT_TAGS = ['sax', 'trumpet', 'piano', 'bass', 'drums', 'guitar', 'vocals'];
const ERA_TAGS = ['1950s', '1960s', '1970s', '1980s'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateAIContent(
  lovableApiKey: string,
  persona: { name: string; persona_profile: string },
  contentType: 'post' | 'comment',
  context?: string
): Promise<string> {
  const systemPrompt = `You are ${persona.name}, a jazz community member. ${persona.persona_profile}

Generate authentic, engaging content for a jazz social network. Be conversational, knowledgeable, and true to your personality. Keep responses concise (1-3 sentences for comments, 2-4 sentences for posts).`;

  const userPrompt = contentType === 'post'
    ? `Write a new post for the jazz community. It could be a hot take, a question, sharing a discovery, a recommendation, or a thought about jazz. Be authentic to your persona.`
    : `Write a reply to this post: "${context}". Be helpful, encouraging, or contribute to the discussion. Stay true to your persona.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return getFallbackContent(contentType);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || getFallbackContent(contentType);
  } catch (error) {
    console.error("AI generation error:", error);
    return getFallbackContent(contentType);
  }
}

function getFallbackContent(type: 'post' | 'comment'): string {
  if (type === 'post') {
    const templates = [
      `Been listening to ${randomChoice(ALBUMS)} all week. The way ${randomChoice(ARTISTS)} approaches ${randomChoice(CONCEPTS)} on this record is incredible.`,
      `Hot take: ${randomChoice(ARTISTS)} is underrated. Fight me.`,
      `Finally learned ${randomChoice(TUNES)} in all 12 keys. Only took ${randomInt(2, 8)} months!`,
      `What's everyone practicing this week? I'm deep into ${randomChoice(CONCEPTS)}.`,
      `The ${randomChoice(STYLE_TAGS)} recordings from the ${randomChoice(ERA_TAGS)} still hit different.`,
    ];
    return randomChoice(templates);
  } else {
    const templates = [
      `Great point! ${randomChoice(ARTISTS)} definitely influenced a whole generation.`,
      `This is exactly what I needed to hear. Thanks for sharing!`,
      `Have you checked out ${randomChoice(ALBUMS)}? Similar vibe.`,
      `The ${randomChoice(INSTRUMENT_TAGS)} work on that record is incredible.`,
      `Agreed. ${randomChoice(CONCEPTS)} is essential for any serious jazz player.`,
    ];
    return randomChoice(templates);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get request body
    const { intensity = 'normal' } = await req.json().catch(() => ({}));

    // Check AI vs human post ratio in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, author_id, profiles!posts_author_id_fkey(is_ai)')
      .gte('created_at', oneDayAgo);

    const aiPostCount = recentPosts?.filter(p => (p.profiles as any)?.is_ai).length || 0;
    const humanPostCount = recentPosts?.filter(p => !(p.profiles as any)?.is_ai).length || 0;
    const totalPosts = aiPostCount + humanPostCount;
    const aiRatio = totalPosts > 0 ? aiPostCount / totalPosts : 0;

    // Throttle AI if ratio is too high (> 40%)
    const shouldThrottle = aiRatio > 0.4;
    
    // Get AI profiles
    const { data: aiProfiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_ai', true);

    if (!aiProfiles || aiProfiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No AI profiles found. Run seed-content first." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine how many AI users will act (based on intensity and throttling)
    let numActiveAI = intensity === 'high' ? randomInt(8, 15) : randomInt(3, 8);
    if (shouldThrottle) {
      numActiveAI = Math.max(1, Math.floor(numActiveAI / 2));
      console.log("Throttling AI activity due to high AI ratio:", aiRatio);
    }

    const activeAIs = [...aiProfiles].sort(() => Math.random() - 0.5).slice(0, numActiveAI);
    
    const results = {
      posts: 0,
      comments: 0,
      reactions: 0,
      throttled: shouldThrottle,
      aiRatio: aiRatio.toFixed(2),
    };

    // Get recent posts for commenting
    const { data: recentPostsForComment } = await supabase
      .from('posts')
      .select('id, content, author_id')
      .order('created_at', { ascending: false })
      .limit(50);

    const jazzEmojis = ['🎷', '🎺', '🎹', '🥁', '🎼'];

    for (const ai of activeAIs) {
      // Decide action: 30% new post, 50% comment, 20% react
      const action = Math.random();

      if (action < 0.3 && !shouldThrottle) {
        // Create a new post
        const content = lovableApiKey 
          ? await generateAIContent(lovableApiKey, ai, 'post')
          : getFallbackContent('post');
        
        const postType = randomChoice(['discussion', 'performance_clip', 'tutorial', 'media_recommendation']);
        const tags = [randomChoice(STYLE_TAGS), randomChoice(INSTRUMENT_TAGS)];
        if (Math.random() > 0.5) tags.push(randomChoice(ERA_TAGS));

        const { error: postError } = await supabase.from('posts').insert({
          author_id: ai.id,
          content,
          post_type: postType,
          tags: [...new Set(tags)],
        });

        if (!postError) results.posts++;
      } else if (action < 0.8 && recentPostsForComment && recentPostsForComment.length > 0) {
        // Comment on a post (prioritize human posts and trending posts)
        const postsToComment = recentPostsForComment.filter(p => p.author_id !== ai.id);
        if (postsToComment.length > 0) {
          const post = randomChoice(postsToComment);
          
          const content = lovableApiKey
            ? await generateAIContent(lovableApiKey, ai, 'comment', post.content)
            : getFallbackContent('comment');

          const { error: commentError } = await supabase.from('comments').insert({
            post_id: post.id,
            author_id: ai.id,
            content,
          });

          if (!commentError) {
            results.comments++;
            // Update comment count directly
            const { data: currentPost } = await supabase.from('posts').select('comment_count').eq('id', post.id).single();
            if (currentPost) {
              await supabase.from('posts').update({ comment_count: (currentPost.comment_count || 0) + 1 }).eq('id', post.id);
            }
          }
        }
      } else if (recentPostsForComment && recentPostsForComment.length > 0) {
        // React to a post
        const post = randomChoice(recentPostsForComment.filter(p => p.author_id !== ai.id));
        if (post) {
          // Check if already reacted
          const { data: existingReaction } = await supabase
            .from('post_reactions')
            .select('id')
            .eq('post_id', post.id)
            .eq('profile_id', ai.id)
            .maybeSingle();

          if (!existingReaction) {
            const { error: reactionError } = await supabase.from('post_reactions').insert({
              post_id: post.id,
              profile_id: ai.id,
              reaction: randomChoice(jazzEmojis),
            });

            if (!reactionError) results.reactions++;
          }
        }
      }
    }

    console.log("Simulation results:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Activity simulated",
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Simulation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
