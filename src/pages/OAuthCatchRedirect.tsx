import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { startGoogleOAuth } from '@/lib/oauth';
import { Music } from 'lucide-react';

/**
 * Catch-all for /~oauth/* routes that might be hit directly on custom domains.
 * 
 * This can happen when:
 * 1. A service worker intercepts the navigation to the broker
 * 2. The browser fails to redirect away from the current origin
 * 3. The user navigates directly to this path
 * 
 * We detect if there's a provider param and either restart the OAuth flow
 * or redirect to auth.
 */
const OAuthCatchRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('[OAuthCatch] Hit OAuth catch route:', location.pathname, location.search);
    
    // Parse the URL to check for provider
    const searchParams = new URLSearchParams(location.search);
    const provider = searchParams.get('provider');
    
    if (provider === 'google') {
      console.log('[OAuthCatch] Detected Google provider, restarting OAuth flow');
      // Small delay to ensure the page has rendered, then restart OAuth
      setTimeout(() => {
        startGoogleOAuth();
      }, 100);
      return;
    }
    
    // For any other case, just redirect to auth
    console.log('[OAuthCatch] No known provider, redirecting to /auth');
    navigate('/auth', { replace: true });
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-primary mb-3">
          <Music className="w-7 h-7 text-primary-foreground" />
        </div>
        <p className="text-muted-foreground">Redirecting to Google...</p>
      </div>
    </div>
  );
};

export default OAuthCatchRedirect;
