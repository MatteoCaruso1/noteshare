import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Fallback route for cases where the OAuth initiate URL is hit on a custom domain.
// We forward to the Lovable Cloud broker which actually serves /~oauth/initiate.
const OAUTH_BROKER_URL = "https://jazz-scene-alive.lovable.app/~oauth/initiate";

export default function OAuthInitiateRedirect() {
  // Preserve both search and hash params
  const targetUrl = useMemo(() => {
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    return `${OAUTH_BROKER_URL}${search}${hash}`;
  }, []);

  const [attempted, setAttempted] = useState(false);
  const [likelyBlocked, setLikelyBlocked] = useState(false);

  const navigate = (method: "assign" | "replace") => {
    // Log for debugging (these logs are safe; no secrets)
    console.log("[OAuthRedirect] Incoming URL:", window.location.href);
    console.log("[OAuthRedirect] Redirecting to broker:", targetUrl);

    if (method === "replace") window.location.replace(targetUrl);
    else window.location.assign(targetUrl);
  };

  useEffect(() => {
    // Auto-redirect quickly, but also support manual redirect (some browsers/extensions
    // block non-user-initiated navigations to auth providers).
    setAttempted(true);

    // First try immediately.
    navigate("replace");

    // If we're still here after a moment, assume navigation was blocked and show manual CTA.
    const t = window.setTimeout(() => {
      setLikelyBlocked(true);
    }, 1200);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Redirecting to Google...</p>

      {attempted && likelyBlocked && (
        <div className="mt-2 flex flex-col items-center gap-3 max-w-md">
          <p className="text-sm text-foreground">
            If nothing happens, your browser may be blocking the automatic redirect.
          </p>
          <Button onClick={() => navigate("assign")}>Continue to Google</Button>
          <p className="text-xs text-muted-foreground break-all">
            {targetUrl}
          </p>
        </div>
      )}
    </div>
  );
}

