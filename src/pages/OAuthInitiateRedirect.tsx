import { useEffect } from "react";
import { Loader2 } from "lucide-react";

// Fallback route for cases where the OAuth initiate URL is hit on a custom domain.
// We forward to the Lovable Cloud broker which actually serves /~oauth/initiate.
const OAUTH_BROKER_URL = "https://jazz-scene-alive.lovable.app/~oauth/initiate";

export default function OAuthInitiateRedirect() {
  useEffect(() => {
    // Log for debugging
    console.log('[OAuthRedirect] Incoming URL:', window.location.href);
    
    // Preserve both search and hash params
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    const targetUrl = `${OAUTH_BROKER_URL}${search}${hash}`;
    
    console.log('[OAuthRedirect] Redirecting to broker:', targetUrl);
    
    // Use replace to avoid polluting browser history
    window.location.replace(targetUrl);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Redirecting to Google...</p>
    </div>
  );
}
