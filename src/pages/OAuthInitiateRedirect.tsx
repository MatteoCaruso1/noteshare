import { useEffect } from "react";

// Fallback route for cases where the OAuth initiate URL is hit on a custom domain.
// We forward to the Lovable Cloud broker which actually serves /~oauth/initiate.
const OAUTH_BROKER_URL = "https://jazz-scene-alive.lovable.app/~oauth/initiate";

export default function OAuthInitiateRedirect() {
  useEffect(() => {
    const search = window.location.search || "";
    window.location.replace(`${OAUTH_BROKER_URL}${search}`);
  }, []);

  return <div className="min-h-screen bg-background" />;
}
