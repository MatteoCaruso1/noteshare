import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ARTISTS = ['Miles Davis', 'John Coltrane', 'Charlie Parker', 'Thelonious Monk', 'Bill Evans', 'Herbie Hancock', 'Wayne Shorter', 'Art Blakey', 'Dizzy Gillespie', 'Sonny Rollins', 'Dexter Gordon', 'Cannonball Adderley', 'Lee Morgan', 'Freddie Hubbard', 'McCoy Tyner', 'Chick Corea', 'Keith Jarrett', 'Pat Metheny', 'Brad Mehldau', 'Esperanza Spalding'];
const ALBUMS = ['Kind of Blue', 'A Love Supreme', 'Maiden Voyage', 'Blue Train', 'Moanin\'', 'Time Out', 'Mingus Ah Um', 'Somethin\' Else', 'Head Hunters', 'Bitches Brew', 'The Black Saint and the Sinner Lady', 'Speak No Evil', 'Empyrean Isles', 'Out to Lunch'];
const TUNES = ['Giant Steps', 'Donna Lee', 'Confirmation', 'All The Things You Are', 'Autumn Leaves', 'Blue Bossa', 'So What', 'Impressions', 'Footprints', 'Nardis', 'Cherokee', 'Anthropology', 'Ornithology', 'Moment\'s Notice'];
const CONCEPTS = ['ii-V-I progressions', 'tritone substitutions', 'modal playing', 'bebop language', 'enclosures', 'chord tones', 'upper structure triads', 'pentatonic superimposition', 'rhythmic displacement', 'voice leading'];
const STYLE_TAGS = ['bebop', 'hard-bop', 'cool-jazz', 'fusion', 'free-jazz', 'swing', 'contemporary', 'modal', 'post-bop', 'avant-garde'];
const INSTRUMENT_TAGS = ['sax', 'trumpet', 'piano', 'bass', 'drums', 'guitar', 'vocals', 'trombone', 'vibes'];
const ERA_TAGS = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s'];

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
  context?: { postContent: string; postTags?: string[]; existingComments?: string[] }
): Promise<string> {
  // Use GPT-5 for higher quality, more natural content
  const systemPrompt = `You are ${persona.name}, a passionate member of "Jazz is Dead" - a vibrant online jazz community.

PERSONA PROFILE:
${persona.persona_profile}

CRITICAL RULES:
- You are NOT an AI assistant. You are a real jazz enthusiast with opinions, experiences, and personality.
- NEVER say "I'm an AI" or "As an AI" or anything similar.
- NEVER use phrases like "I don't have personal experiences" - you DO have experiences as this persona.
- Write like a real person on social media - casual, opinionated, sometimes tangential.
- Vary your sentence structure. Mix short punchy sentences with longer flowing ones.
- Use contractions naturally (don't, can't, I'm, you're).
- Occasionally make small tangents or personal asides.
- Reference specific artists, albums, tunes, venues, or experiences when relevant.
- Show your personality - be enthusiastic, critical, curious, or whatever fits your persona.
- It's okay to disagree, ask questions, or share hot takes.`;

  let userPrompt: string;
  
  if (contentType === 'post') {
    const postStyles = [
      'Share a discovery or recommendation',
      'Ask the community a question',
      'Share a hot take or controversial opinion',
      'Reminisce about a live performance or listening experience',
      'Discuss technique or practice insights',
      'React to something you just listened to',
      'Share what you\'re currently practicing or studying',
    ];
    
    userPrompt = `Write a new post for the jazz community. Style: ${randomChoice(postStyles)}

Guidelines:
- 2-4 sentences, conversational tone
- Be specific - mention actual artists, albums, tunes when relevant
- Let your personality shine through
- Don't be generic - say something interesting or provocative`;
  } else {
    const existingContext = context?.existingComments?.length 
      ? `\n\nOther comments on this post:\n${context.existingComments.slice(0, 3).map(c => `- "${c}"`).join('\n')}`
      : '';
    
    userPrompt = `Reply to this post in the jazz community:

POST: "${context?.postContent}"
${context?.postTags?.length ? `Tags: ${context.postTags.join(', ')}` : ''}${existingContext}

Guidelines for your reply:
- Write 1-3 paragraphs (not just one sentence!)
- Engage meaningfully with what the poster said
- Add your own perspective, experience, or knowledge
- Reference specific music when relevant (albums, artists, tunes)
- Ask a follow-up question sometimes
- Show your unique persona - agree, disagree, add nuance, or take it in a new direction
- Sound like a real person having a conversation, not a generic response`;
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: contentType === 'comment' ? 400 : 250,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return getFallbackContent(contentType);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return getFallbackContent(contentType);
    }
    
    // Clean up any quotes that might wrap the response
    return content.replace(/^["']|["']$/g, '').trim();
  } catch (error) {
    console.error("AI generation error:", error);
    return getFallbackContent(contentType);
  }
}

function getFallbackContent(type: 'post' | 'comment'): string {
  if (type === 'post') {
    const templates = [
      `Been listening to ${randomChoice(ALBUMS)} all week. The way ${randomChoice(ARTISTS)} approaches ${randomChoice(CONCEPTS)} on this record is incredible. That ${randomChoice(TUNES)} take especially - pure fire.`,
      `Hot take: ${randomChoice(ARTISTS)} is criminally underrated. The work on ${randomChoice(ALBUMS)} alone should cement their legacy. Fight me.`,
      `Finally learned ${randomChoice(TUNES)} in all 12 keys. Only took ${randomInt(2, 8)} months! Now I actually hear the changes instead of just playing over them.`,
      `What's everyone practicing this week? I'm deep into ${randomChoice(CONCEPTS)}. ${randomChoice(ARTISTS)}'s approach has been a revelation.`,
      `The ${randomChoice(STYLE_TAGS)} recordings from the ${randomChoice(ERA_TAGS)} still hit different. Something about the room sound and the way these cats interacted.`,
      `Just discovered ${randomChoice(ARTISTS)} for the first time and I can't stop listening. Where has this been all my life? Any album recommendations?`,
    ];
    return randomChoice(templates);
  } else {
    const templates = [
      `Great point about ${randomChoice(ARTISTS)}! I've been thinking about this lately too. Have you checked out ${randomChoice(ALBUMS)}? Similar vibe but they take ${randomChoice(CONCEPTS)} in a completely different direction. Would love to hear your thoughts on how they compare.`,
      `This is exactly what I needed to hear today. The ${randomChoice(INSTRUMENT_TAGS)} work on that record is incredible - especially how they handle the ${randomChoice(CONCEPTS)}. I've been trying to incorporate some of those ideas into my playing.`,
      `Agreed 100%. ${randomChoice(CONCEPTS)} is essential for any serious jazz player. I remember when ${randomChoice(ARTISTS)} clicked for me - it was like a whole new world opened up. What was your "aha" moment with this stuff?`,
      `Interesting take! I'd add that ${randomChoice(ARTISTS)} did something similar on ${randomChoice(ALBUMS)}, though with a different approach to the harmony. The way they voice those changes over ${randomChoice(TUNES)} is worth checking out if you haven't already.`,
      `Man, this brings back memories. First time I heard ${randomChoice(ALBUMS)} was life-changing. ${randomChoice(ARTISTS)} on that record just speaks to something deeper. What got you into ${randomChoice(STYLE_TAGS)} in the first place?`,
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

    // Get recent posts for commenting (with their content and tags)
    const { data: recentPostsForComment } = await supabase
      .from('posts')
      .select('id, content, tags, author_id')
      .order('created_at', { ascending: false })
      .limit(50);

    const jazzEmojis = ['🎷', '🎺', '🎹', '🥁', '🎼'];

    for (const ai of activeAIs) {
      // Decide action: 25% new post, 55% comment, 20% react
      const action = Math.random();

      if (action < 0.25 && !shouldThrottle) {
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
        // Comment on a post (prioritize posts without many comments)
        const postsToComment = recentPostsForComment.filter(p => p.author_id !== ai.id);
        if (postsToComment.length > 0) {
          const post = randomChoice(postsToComment);
          
          // Get existing comments for context
          const { data: existingComments } = await supabase
            .from('comments')
            .select('content')
            .eq('post_id', post.id)
            .order('created_at', { ascending: true })
            .limit(5);
          
          const content = lovableApiKey
            ? await generateAIContent(lovableApiKey, ai, 'comment', {
                postContent: post.content,
                postTags: post.tags,
                existingComments: existingComments?.map(c => c.content) || [],
              })
            : getFallbackContent('comment');

          const { error: commentError } = await supabase.from('comments').insert({
            post_id: post.id,
            author_id: ai.id,
            content,
          });

          if (!commentError) {
            results.comments++;
            // Update comment count
            const { data: currentPost } = await supabase
              .from('posts')
              .select('comment_count')
              .eq('id', post.id)
              .single();
            
            if (currentPost) {
              await supabase
                .from('posts')
                .update({ comment_count: (currentPost.comment_count || 0) + 1 })
                .eq('id', post.id);
            }
          }
        }
      } else if (recentPostsForComment && recentPostsForComment.length > 0) {
        // React to a post
        const postsForReaction = recentPostsForComment.filter(p => p.author_id !== ai.id);
        const post = randomChoice(postsForReaction);
        if (post) {
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
