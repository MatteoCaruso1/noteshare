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
    // /storage/v1/object/{bucket}/{path}
    const match = u.pathname.match(/\/storage\/v1\/object\/(?:public\/|authenticated\/)?([^/]+)\/(.+)/);
    if (!match) return null;
    return { bucket: match[1], path: decodeURIComponent(match[2]) };
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
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

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    const expiresInSeconds =
      ("expiresInSeconds" in body && body.expiresInSeconds) || 60 * 60 * 24; // 24h

    const toSign: string[] = "urls" in body ? body.urls : [body.url];

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

        // Already signed
        try {
          const u = new URL(input);
          if (u.searchParams.has("token")) {
            results[input] = input;
            return;
          }
        } catch {
          // ignore
        }

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
