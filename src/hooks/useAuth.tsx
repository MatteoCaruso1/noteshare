import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Profile } from '@/types';
import { clearSignedUrlCache, clearAllSignedUrlCaches } from '@/hooks/useSignedUrl';
import { isOAuthCallback } from '@/lib/oauth';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isNewUser: boolean; // True if this is a brand new user (profile just created)
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearNewUserFlag: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  // Track if we've already processed the current session to avoid re-triggering isNewUser
  const processedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    // Detect if running inside a native Capacitor shell (iOS/Android).
    // In native apps, sessionStorage is unreliable — WKWebView can wipe it on
    // background kill, process termination, or memory pressure. We ALWAYS persist
    // the session on native; "Remember me" logic only applies to web browsers.
    const cap = (window as any).Capacitor;
    const isNativeApp = typeof cap !== 'undefined'
      && (cap.getPlatform?.() !== 'web'           // Capacitor 4+: 'ios' | 'android'
        || cap.isNativePlatform?.() === true       // Capacitor 5+
        || document.URL.startsWith('capacitor://') // legacy fallback
      );

    // Check if user should be signed out (browser was closed without "Remember me")
    const rememberMe = localStorage.getItem('noteshare_remember_me');
    const sessionActive = sessionStorage.getItem('noteshare_session_active');
    
    // Check if this is a password reset flow - don't interfere with it
    const isPasswordResetFlow = window.location.search.includes('reset=true') || 
                                 window.location.hash.includes('type=recovery');
    
    // Check if this is an OAuth callback using the centralized helper
    const oauthCallbackDetected = isOAuthCallback();
    
    // Wrap auth initialization in async function with error handling
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Handle explicit errors from getSession (e.g., invalid refresh token)
        if (error) {
          console.warn('Auth session error:', error.message);
          // Clear any stale auth data gracefully
          try {
            await supabase.auth.signOut();
          } catch {
            // Ignore signOut errors during cleanup
          }
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        // If there's a session but "Remember me" was not checked and browser was closed
        // BUT skip this check entirely for native apps (sessionStorage is unreliable in WKWebView)
        // Also skip for password reset flows and OAuth callbacks
        if (session && !isNativeApp && !rememberMe && !sessionActive && !isPasswordResetFlow && !oauthCallbackDetected) {
          // Sign out the user since they didn't want to be remembered
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        // For OAuth callbacks, ensure "remember me" is set (OAuth users expect to stay logged in)
        if (session && oauthCallbackDetected) {
          localStorage.setItem('noteshare_remember_me', 'true');
        }

        setSession(session);
        setUser(session?.user ?? null);

        // Important: notes depend on profile.id (author_id), so keep the app "loading"
        // until we have the profile to avoid a long "no notes" flash.
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      } catch (err) {
        // Catch any unexpected errors during initialization (e.g., network issues, token refresh failures)
        console.warn('Auth initialization error:', err);
        // Gracefully degrade to logged-out state instead of crashing
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Handle token refresh failures gracefully
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('Token refresh failed, treating as signed out');
          setSession(null);
          setUser(null);
          setProfile(null);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        // Clear stale query cache only on real auth transitions (not token refresh)
        // TOKEN_REFRESHED happens frequently on mobile resume and should NOT wipe cached data
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          queryClient.clear();
        }
        if (event === 'SIGNED_OUT') {
          clearAllSignedUrlCaches(); // Clear both memory and persistent cache
        } else if (event === 'SIGNED_IN') {
          clearSignedUrlCache(); // Only clear memory cache on sign-in (user might be different)
        }
        // Note: TOKEN_REFRESHED no longer clears any URL caches
        
        if (session?.user) {
          // Check for new user on SIGNED_IN events (includes OAuth)
          fetchProfile(session.user.id, event === 'SIGNED_IN');
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, checkIsNew: boolean = false): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    } else if (data) {
      const profileData = data as Profile;
      setProfile(profileData);
      
      // Check if this is a genuinely new user (profile created within last 30 seconds)
      // This handles OAuth signups where we can't distinguish signup from signin
      if (checkIsNew && processedSessionRef.current !== userId) {
        const createdAt = new Date(profileData.created_at);
        const now = new Date();
        const ageMs = now.getTime() - createdAt.getTime();
        const isNew = ageMs < 30000; // Profile created less than 30 seconds ago
        
        if (isNew) {
          console.log('[Auth] Detected new user - profile age:', ageMs, 'ms');
          setIsNewUser(true);
        }
        processedSessionRef.current = userId;
      }
      
      return profileData;
    }
    return null;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    const username = name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).slice(2, 6);
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name,
          username,
        },
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(error.message);
      }
      throw error;
    }

    // No toast here — the onboarding welcome modal handles the greeting
  };

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }

    // If "Remember me" is checked, store a marker in sessionStorage
    // When browser closes, sessionStorage clears, so we know to sign out
    if (rememberMe) {
      localStorage.setItem('noteshare_remember_me', 'true');
    } else {
      localStorage.removeItem('noteshare_remember_me');
      sessionStorage.setItem('noteshare_session_active', 'true');
    }

    toast.success('Welcome back!');
  };


  const signOut = async () => {
    // Clear remember me flags first
    localStorage.removeItem('noteshare_remember_me');
    sessionStorage.removeItem('noteshare_session_active');

    // Flush pending saves (e.g. Practice Routine) while session is still valid
    window.dispatchEvent(new CustomEvent('noteshare:before-signout'));
    
    try {
      const { error } = await supabase.auth.signOut();
      // Ignore "session not found" errors - session is already gone, which is fine
      if (error && !error.message.toLowerCase().includes('session')) {
        console.warn('Sign out warning:', error.message);
      }
    } catch (err) {
      // Silently handle any signOut errors - the goal is to clear local state
      console.debug('SignOut caught error:', err);
    }
    
    // Always clear local auth state regardless of server response
    setSession(null);
    setUser(null);
    setProfile(null);
    queryClient.clear();
    clearAllSignedUrlCaches(); // Clear all caches including persistent on explicit sign-out
    toast.success('Signed out');
  };

  const resetPassword = async (email: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      toast.success('Check your email for the password reset link');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email';
      toast.error(message);
      throw error;
    }
  };

  const clearNewUserFlag = () => {
    setIsNewUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, isNewUser, signUp, signIn, signOut, resetPassword, refreshProfile, clearNewUserFlag }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
