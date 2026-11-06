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

const MAX_URLS = 100;
const ALLOWED_BUCKETS = new Set(["practice-media", "notes-media"]);

function passThroughAll(toSign: string[]) {
  const results: Record<string, string> = {};
  for (const url of toSign) if (url) results[url] = url;
  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Quote a value for a PostgREST filter.
const q = (v: string) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

// Is this file referenced by a row the caller is allowed to read?
// `db` runs as the caller (their JWT, or anon for logged-out viewers), so the
// tables' own row-level security decides what counts as visible.
// deno-lint-ignore no-explicit-any
async function referencedInVisibleRow(db: any, supabaseUrl: string, ref: StorageRef): Promise<boolean> {
  const variants = [
    ref.path,
    `${ref.bucket}/${ref.path}`,
    `${supabaseUrl}/storage/v1/object/public/${ref.bucket}/${ref.path}`,
  ];
  const arr = (col: string) => variants.map((v) => `${col}.cs.{${q(v)}}`);
  const txt = (col: string) => variants.map((v) => `${col}.eq.${q(v)}`);
  const checks: Array<[string, string[]]> = [
    ["notes", [...arr("audio_files"), ...arr("image_files"), ...arr("video_files"), ...txt("video_path"), ...txt("video_thumbnail_path")]],
    ["group_posts", arr("audio_files")],
    ["note_comments", txt("audio_url")],
    ["profiles", txt("avatar")],
    ["groups", [...txt("cover_image"), ...txt("profile_image")]],
    ["projects", txt("cover_image")],
    ["promo_posts", txt("image")],
  ];
  for (const [table, filters] of checks) {
    const { data, error } = await db.from(table).select("id").or(filters.join(",")).limit(1);
    if (error) {
      console.log("[get-signed-url] reference check failed:", table, error.message);
      continue;
    }
    if (data && data.length > 0) return true;
  }
  return false;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Body;
    const rawList: string[] = "urls" in body ? body.urls : [body.url];
    if (!Array.isArray(rawList)) {
      return new Response(JSON.stringify({ error: "Bad request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const toSign = rawList.filter((u) => typeof u === "string").slice(0, MAX_URLS);
    const requested = Number(("expiresInSeconds" in body && body.expiresInSeconds) || 0);
    const expiresInSeconds = Math.min(Math.max(requested || 60 * 60 * 24, 60), 60 * 60 * 24);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Who is asking? A signed-in user, or a logged-out viewer.
    const token = getBearerToken(req.headers.get("Authorization"));
    let userId: string | null = null;
    if (token) {
      const { data } = await admin.auth.getUser(token);
      userId = data?.user?.id ?? null;
    }
    if (!userId && !body.public) return passThroughAll(toSign);

    // Runs queries as the caller, so row-level security applies.
    const callerDb = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: userId ? { headers: { Authorization: `Bearer ${token}` } } : {},
    });

    // The caller's own folder names (auth id and profile id) and accepted friends.
    const own = new Set<string>();
    let friendFolders = new Set<string>();
    if (userId) {
      own.add(userId);
      const { data: myProfiles } = await admin.from("profiles").select("id").eq("user_id", userId);
      const myIds = (myProfiles ?? []).map((p: { id: string }) => p.id);
      myIds.forEach((id: string) => own.add(id));
      if (myIds.length > 0) {
        const list = myIds.join(",");
        const { data: friends } = await admin
          .from("friendships")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.in.(${list}),addressee_id.in.(${list})`);
        friendFolders = new Set(
          (friends ?? []).flatMap((f: { requester_id: string; addressee_id: string }) => [f.requester_id, f.addressee_id]),
        );
        myIds.forEach((id: string) => friendFolders.delete(id));
      }
    }

    const results: Record<string, string> = {};

    await Promise.all(
      toSign.map(async (input) => {
        if (!input) return;

        if (input.startsWith("blob:") || isExternalUrl(input)) {
          results[input] = input;
          return;
        }

        const ref = parseStorageRef(input);
        if (!ref || !ALLOWED_BUCKETS.has(ref.bucket) || ref.path.split("/").includes("..")) {
          results[input] = input;
          return;
        }

        // Only sign files the caller may see: their own, an accepted friend's
        // practice media (same rule as the storage policy), or a file that a
        // row they can read points to.
        const folder = ref.path.split("/")[0];
        const allowed =
          own.has(folder) ||
          (ref.bucket === "practice-media" && friendFolders.has(folder)) ||
          (await referencedInVisibleRow(callerDb, supabaseUrl, ref));
        if (!allowed) {
          results[input] = input;
          return;
        }

        const { data, error } = await admin.storage
          .from(ref.bucket)
          .createSignedUrl(ref.path, expiresInSeconds);

        results[input] = error || !data?.signedUrl ? input : data.signedUrl;
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
