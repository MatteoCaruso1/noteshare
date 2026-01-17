import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type StorageRef = { bucket: string; path: string };

type Body =
  | { url: string; expiresInSeconds?: number }
  | { urls: string[]; expiresInSeconds?: number };

function parseStorageRef(input: string): StorageRef | null {
  if (!input) return null;

  // Direct stored paths (legacy)
  if (!input.startsWith("http") && !input.startsWith("blob:")) {
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

    const authHeader = req.headers.get("Authorization");
    
    // If no auth, return original URLs so the app doesn't break
    if (!authHeader) {
      console.log("[get-signed-url] No auth header, returning original URLs");
      const results: Record<string, string> = {};
      for (const url of toSign) {
        if (url) results[url] = url;
      }
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user session with anon client + provided JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    // If auth fails, return original URLs gracefully
    if (userError || !user) {
      console.log("[get-signed-url] Auth failed, returning original URLs");
      const results: Record<string, string> = {};
      for (const url of toSign) {
        if (url) results[url] = url;
      }
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client bypasses storage RLS, but we still require an authenticated caller.
    const admin = createClient(supabaseUrl, serviceRoleKey);

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

        const { data, error } = await admin.storage
          .from(ref.bucket)
          .createSignedUrl(ref.path, expiresInSeconds);

        if (error || !data?.signedUrl) {
          // Keep the original so the client can still try to render something.
          results[input] = input;
          return;
        }

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
