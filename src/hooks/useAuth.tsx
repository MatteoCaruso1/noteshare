import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Profile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user should be signed out (browser was closed without "Remember me")
    const rememberMe = localStorage.getItem('noteshare_remember_me');
    const sessionActive = sessionStorage.getItem('noteshare_session_active');
    
    // Check if this is a password reset flow - don't interfere with it
    const isPasswordResetFlow = window.location.search.includes('reset=true') || 
                                 window.location.hash.includes('type=recovery');
    
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // If there's a session but "Remember me" was not checked and browser was closed
      // BUT skip this check if we're in a password reset flow
      if (session && !rememberMe && !sessionActive && !isPasswordResetFlow) {
        // Sign out the user since they didn't want to be remembered
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
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
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
    } else if (data) {
      setProfile(data as Profile);
    }
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

    toast.success('Welcome to Noteshare!');
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

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const signOut = async () => {
    // Clear remember me flags
    localStorage.removeItem('noteshare_remember_me');
    sessionStorage.removeItem('noteshare_session_active');
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      throw error;
    }
    toast.success('Signed out');
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success('Check your email for the password reset link');
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signUp, signIn, signInWithGoogle, signOut, resetPassword, refreshProfile }}>
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
