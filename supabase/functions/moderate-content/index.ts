import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ModerationResult {
  flagged: boolean;
  reason?: string;
  confidence: number;
  categories: string[];
}

async function moderateWithAI(
  content: string,
  lovableApiKey: string
): Promise<ModerationResult> {
  const systemPrompt = `You are a content moderator for a jazz music community. Analyze the following content and determine if it violates community guidelines.

Flag content that contains:
1. Harassment, hate speech, or personal attacks
2. Explicit/NSFW content
3. Obvious spam or promotional content
4. Copyright violations (full song/movie uploads)

For a jazz community, allow:
- Strong opinions about music (even controversial ones)
- Discussions of jazz history including complex topics
- Self-promotion of original music (not spam)
- Technical discussions

Respond with a JSON object:
{
  "flagged": boolean,
  "reason": "brief reason if flagged",
  "confidence": number between 0.0 and 1.0,
  "categories": ["harassment", "nsfw", "spam", "copyright"] // applicable categories
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this content: "${content}"` },
        ],
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      console.error("Moderation API error:", response.status);
      return { flagged: false, confidence: 0, categories: [] };
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        flagged: result.flagged || false,
        reason: result.reason,
        confidence: result.confidence || 0,
        categories: result.categories || [],
      };
    }
    
    return { flagged: false, confidence: 0, categories: [] };
  } catch (error) {
    console.error("Moderation error:", error);
    return { flagged: false, confidence: 0, categories: [] };
  }
}

// Simple keyword-based moderation fallback
function moderateWithKeywords(content: string): ModerationResult {
  const lowerContent = content.toLowerCase();
  
  // Obvious spam patterns
  const spamPatterns = [
    /buy now/i,
    /click here/i,
    /limited time offer/i,
    /free money/i,
    /crypto giveaway/i,
  ];
  
  for (const pattern of spamPatterns) {
    if (pattern.test(content)) {
      return {
        flagged: true,
        reason: "Potential spam detected",
        confidence: 0.7,
        categories: ["spam"],
      };
    }
  }

  // Very basic profanity check (would be more comprehensive in production)
  const hateSpeechPatterns = [
    /\b(hate|kill|die)\s+(all|every)\s+\w+/i,
  ];
  
  for (const pattern of hateSpeechPatterns) {
    if (pattern.test(content)) {
      return {
        flagged: true,
        reason: "Potential hate speech detected",
        confidence: 0.6,
        categories: ["harassment"],
      };
    }
  }

  return { flagged: false, confidence: 0, categories: [] };
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

    const { content, targetType, targetId } = await req.json();

    if (!content || !targetType || !targetId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: content, targetType, targetId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Moderate content
    let result: ModerationResult;
    
    if (lovableApiKey) {
      result = await moderateWithAI(content, lovableApiKey);
    } else {
      result = moderateWithKeywords(content);
    }

    console.log("Moderation result:", { targetType, targetId, result });

    // If flagged, create a moderation flag record
    if (result.flagged && result.confidence > 0.5) {
      const { error: flagError } = await supabase.from('moderation_flags').insert({
        target_type: targetType,
        target_id: targetId,
        reason: result.reason || result.categories.join(', '),
        confidence: result.confidence,
        status: 'pending',
      });

      if (flagError) {
        console.error("Error creating moderation flag:", flagError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Moderation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
