import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Music, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Broker URL - must match oauth.ts
const OAUTH_BROKER_URL = "https://jazz-scene-alive.lovable.app/~oauth/initiate";

/**
 * Catch-all for /~oauth/* routes that might be hit directly on custom domains.
 * 
 * This happens when the service worker intercepts the navigation to the broker
 * and renders the app instead. We show a manual "Continue to Google" button
 * that users can click to bypass the service worker.
 */
const OAuthCatchRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showManualButton, setShowManualButton] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  // Build the broker URL with current params
  const searchParams = new URLSearchParams(location.search);
  const provider = searchParams.get('provider');
  const redirectUri = searchParams.get('redirect_uri') || `${window.location.origin}/auth`;
  
  const brokerUrl = provider 
    ? `${OAUTH_BROKER_URL}?provider=${provider}&redirect_uri=${encodeURIComponent(redirectUri)}`
    : null;

  useEffect(() => {
    console.log('[OAuthCatch] Hit OAuth catch route:', location.pathname, location.search);
    console.log('[OAuthCatch] Provider:', provider);
    console.log('[OAuthCatch] Broker URL:', brokerUrl);
    
    if (!provider) {
      // No provider - just redirect to auth
      console.log('[OAuthCatch] No provider, redirecting to /auth');
      navigate('/auth', { replace: true });
      return;
    }
    
    // Try to navigate using window.location.replace
    // This sometimes bypasses service worker better than href assignment
    if (brokerUrl) {
      console.log('[OAuthCatch] Attempting window.location.replace to broker');
      
      try {
        window.location.replace(brokerUrl);
      } catch (e) {
        console.error('[OAuthCatch] Replace failed:', e);
      }
      
      // Show manual button after 1.5 seconds if we're still here
      const timeout = setTimeout(() => {
        console.log('[OAuthCatch] Still on page, showing manual button');
        setShowManualButton(true);
      }, 1500);
      
      return () => clearTimeout(timeout);
    }
  }, [location, navigate, provider, brokerUrl]);

  // Handle manual button click - use anchor tag for user gesture
  const handleManualClick = () => {
    if (linkRef.current) {
      linkRef.current.click();
    }
  };

  if (!provider) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-primary mb-3">
          <Music className="w-7 h-7 text-primary-foreground" />
        </div>
        
        {!showManualButton ? (
          <p className="text-muted-foreground">Redirecting to Google...</p>
        ) : (
          <>
            <p className="text-foreground font-medium">
              Your browser blocked the automatic redirect
            </p>
            <p className="text-sm text-muted-foreground">
              Click the button below to continue to Google sign-in
            </p>
            
            {/* Hidden anchor for user-gesture navigation */}
            <a 
              ref={linkRef}
              href={brokerUrl || '#'}
              className="hidden"
              rel="noopener noreferrer"
            >
              Continue
            </a>
            
            <Button
              onClick={handleManualClick}
              className="w-full gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Continue to Google
            </Button>
            
            <button
              type="button"
              onClick={() => navigate('/auth', { replace: true })}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCatchRedirect;
