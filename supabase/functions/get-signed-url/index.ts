import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type StorageRef = { bucket: string; path: string };

type Body =
  | { url: string; expiresInSeconds?: number; public?: boolean }
  | { urls: string[]; expiresInSeconds?: number; public?: boolean };

function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function parseStorageRef(input: string): StorageRef | null {
  if (!input) return null;

  // Direct stored paths (legacy or bucket-prefixed)
  if (!input.startsWith("http") && !input.startsWith("blob:")) {
    // If prefixed with a known bucket name, extract it
    if (input.startsWith("notes-media/")) {
      return { bucket: "notes-media", path: input.slice("notes-media/".length) };
    }
    return { bucket: "practice-media", path: input };
  }

  try {
    const u = new URL(input);
    // /storage/v1/object/public/{bucket}/{path}
    // /storage/v1/object/authenticated/{bucket}/{path}
    // /storage/v1/object/sign/{bucket}/{path}?token=...
    // /storage/v1/object/{bucket}/{path}
    const match = u.pathname.match(/\/storage\/v1\/object\/(?:public\/|authenticated\/|sign\/)?([^/]+)\/(.+)/);
    if (!match) return null;
    // For signed URLs, the path may have query params - strip them
    let extractedPath = decodeURIComponent(match[2]);
    // Remove any query string that got into the path
    if (extractedPath.includes('?')) {
      extractedPath = extractedPath.split('?')[0];
    }
    return { bucket: match[1], path: extractedPath };
  } catch {
    return null;
  }
}

function isExternalUrl(url: string): boolean {
  if (!url.startsWith("http")) return false;
  try {
    const u = new URL(url);
    return !u.pathname.includes("/storage/v1/object/");
  } catch {
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Body;
    const toSign: string[] = "urls" in body ? body.urls : [body.url];
    const expiresInSeconds =
      ("expiresInSeconds" in body && body.expiresInSeconds) || 60 * 60 * 24; // 24h
    const isPublicRequest = !!body.public;

    const authHeader = req.headers.get("Authorization");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // If no auth and not a public request, return original URLs so the app doesn't break
    if (!authHeader && !isPublicRequest) {
      console.log("[get-signed-url] No auth header, returning original URLs");
      const results: Record<string, string> = {};
      for (const url of toSign) {
        if (url) results[url] = url;
      }
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If auth header present, verify JWT locally (no server round-trip)
    if (authHeader && !isPublicRequest) {
      const token = getBearerToken(authHeader);

      if (!token) {
        console.log("[get-signed-url] Auth failed: Missing bearer token");
        const results: Record<string, string> = {};
        for (const url of toSign) {
          if (url) results[url] = url;
        }
        return new Response(JSON.stringify({ results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error: userError } = await admin.auth.getUser(token);

      if (userError || !data?.user?.id) {
        console.log("[get-signed-url] Auth failed:", userError?.message || "No user");
        const results: Record<string, string> = {};
        for (const url of toSign) {
          if (url) results[url] = url;
        }
        return new Response(JSON.stringify({ results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (isPublicRequest) {
      console.log("[get-signed-url] Public request for", toSign.length, "URLs");
    }

    const results: Record<string, string> = {};

    await Promise.all(
      toSign.map(async (input) => {
        if (!input) return;

        if (input.startsWith("blob:")) {
          results[input] = input;
          return;
        }

        if (isExternalUrl(input)) {
          results[input] = input;
          return;
        }

        // Previously: skip re-signing if URL has token
        // Now: always re-sign to handle expired tokens
        // The parseStorageRef will extract the path from signed URLs

        const ref = parseStorageRef(input);
        if (!ref) {
          results[input] = input;
          return;
        }

        console.log("[get-signed-url] Creating signed URL for:", ref.bucket, ref.path);
        
        const { data, error } = await admin.storage
          .from(ref.bucket)
          .createSignedUrl(ref.path, expiresInSeconds);

        if (error || !data?.signedUrl) {
          console.log("[get-signed-url] Failed to sign:", ref.path, error?.message);
          // Keep the original so the client can still try to render something.
          results[input] = input;
          return;
        }

        console.log("[get-signed-url] Successfully signed:", ref.path);
        results[input] = data.signedUrl;
      })
    );

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[get-signed-url] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
