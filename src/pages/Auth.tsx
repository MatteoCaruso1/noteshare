import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Music, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startGoogleOAuth, parseOAuthCallback, clearOAuthHash } from '@/lib/oauth';

// Google icon component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const Auth = () => {
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'update-password'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [oauthProcessing, setOauthProcessing] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Handle OAuth callback and password recovery tokens
  useEffect(() => {
    const handleAuthCallback = async () => {
      // First, check for OAuth callback tokens
      const oauthTokens = parseOAuthCallback();
      
      if (oauthTokens) {
        console.log('[Auth] OAuth callback detected, processing tokens');
        setOauthProcessing(true);
        
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: oauthTokens.accessToken,
            refresh_token: oauthTokens.refreshToken,
          });
          
          if (error) {
            console.error('[Auth] Error setting OAuth session:', error);
            toast.error('Failed to complete sign in. Please try again.');
            setOauthProcessing(false);
            return;
          }
          
          if (data.session) {
            console.log('[Auth] OAuth session established successfully');
            // Set remember-me for OAuth users (they expect persistent login)
            localStorage.setItem('noteshare_remember_me', 'true');
            // Clear the hash from URL
            clearOAuthHash();
            // Check for profile redirect (from shared profile link)
            const profileRedirectOAuth = localStorage.getItem('noteshare_profile_redirect');
            if (profileRedirectOAuth) {
              localStorage.removeItem('noteshare_profile_redirect');
              navigate(`/profile/${profileRedirectOAuth}`);
            } else {
              navigate('/');
            }
            return;
          }
        } catch (err) {
          console.error('[Auth] Unexpected OAuth error:', err);
          toast.error('An error occurred during sign in.');
          setOauthProcessing(false);
        }
        return;
      }
      
      // Check for password recovery tokens
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const tokenType = hashParams.get('type');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && tokenType === 'recovery') {
          console.log('[Auth] Password recovery token detected');
          
          try {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (error) {
              console.error('[Auth] Error setting recovery session:', error);
              toast.error('Password reset link has expired. Please request a new one.');
            } else {
              console.log('[Auth] Recovery session set, switching to update-password mode');
              setMode('update-password');
              clearOAuthHash();
            }
          } catch (err) {
            console.error('[Auth] Recovery session error:', err);
            toast.error('Failed to process reset link.');
          }
          return;
        }
      }
      
      // Check for reset=true search param (fallback)
      if (searchParams.get('reset') === 'true') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[Auth] Session found with reset param, switching to update-password');
          setMode('update-password');
        }
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] Auth state changed:', event);
      
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update-password');
      }
      
      // If signed in and not processing OAuth or updating password, redirect
      if (event === 'SIGNED_IN' && session && !oauthProcessing && mode !== 'update-password') {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, oauthProcessing, mode]);

  // Reset password touched state when mode changes
  useEffect(() => {
    setPasswordTouched(false);
  }, [mode]);

  // Redirect if already logged in (but not in password update mode)
  if (user && mode !== 'update-password' && !oauthProcessing) {
    navigate('/');
    return null;
  }

  const isPasswordValid = password.length >= 6;
  const showPasswordHint = passwordTouched && !isPasswordValid && password.length > 0;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password updated successfully!');
        navigate('/');
      }
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode !== 'forgot' && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      setPasswordTouched(true);
      return;
    }

    setLoading(true);

    try {
      if (mode === 'forgot') {
        await resetPassword(email);
        setMode('signin');
      } else if (mode === 'signup') {
        await signUp(email, password, name);
        // Don't navigate or start onboarding — email confirmation is required first.
        // The FTUE will trigger automatically when the user confirms and signs in.
        setSignupSuccess(true);
      } else {
        await signIn(email, password, rememberMe);
        // Check for profile redirect (from shared profile link)
        const profileRedirectLogin = localStorage.getItem('noteshare_profile_redirect');
        if (profileRedirectLogin) {
          localStorage.removeItem('noteshare_profile_redirect');
          navigate(`/profile/${profileRedirectLogin}`);
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      // Error is handled in useAuth
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    setLoading(true);
    // Use the centralized OAuth helper - direct browser navigation
    startGoogleOAuth();
  };

  const getTitle = () => {
    switch (mode) {
      case 'forgot': return 'Reset your password';
      case 'signup': return 'Create your account';
      case 'update-password': return 'Set new password';
      default: return null;
    }
  };

  const title = getTitle();

  // Show confirmation screen after email signup
  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Music className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Check your email</h2>
          <p className="text-muted-foreground text-sm">
            We've sent a confirmation link to <strong className="text-foreground">{email}</strong>. 
            Click the link to activate your account and start practicing.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSignupSuccess(false);
              setMode('signin');
            }}
          >
            Back to sign in
          </Button>
        </Card>
      </div>
    );
  }

  // Show loading state while processing OAuth
  if (oauthProcessing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-primary mb-3">
            <Music className="w-7 h-7 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Completing sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-auth-enter">
      <div className="w-full max-w-md">
        {/* Back to landing button */}
        <button
          type="button"
          onClick={() => mode === 'signin' ? navigate('/welcome') : setMode('signin')}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        
        <Card className="w-full p-8 bg-card border-border">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-primary mb-3">
            <Music className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold">Noteshare</h1>
          <p className="text-sm text-muted-foreground mt-1">Helping musicians practice smarter</p>
          {title && <p className="text-muted-foreground mt-2 text-sm">{title}</p>}
        </div>

        {mode === 'update-password' ? (
          <form onSubmit={handleUpdatePassword} noValidate className="space-y-4">
            <div className="space-y-1">
              <Input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                required
                autoComplete="new-password"
                className={showPasswordHint ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {showPasswordHint && (
                <p className="text-xs text-destructive flex items-center gap-1 px-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>Password must be at least 6 characters</span>
                </p>
              )}
            </div>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Button
              type="submit"
              className="w-full bg-gradient-primary text-white hover:opacity-90"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4" autoComplete="on">
            {mode === 'signup' && (
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              name="email"
            />
            {mode !== 'forgot' && (
              <div className="space-y-1">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  name="password"
                  className={showPasswordHint ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {showPasswordHint && (
                  <p className="text-xs text-destructive flex items-center gap-1 px-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>Password must be at least 6 characters</span>
                  </p>
                )}
              </div>
            )}
            {mode === 'signin' && (
              <label 
                htmlFor="remember" 
                className="flex items-center gap-3 py-3 -my-1 cursor-pointer touch-manipulation select-none"
              >
                <div className="p-1 -m-1">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="h-5 w-5"
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  Stay logged in
                </span>
              </label>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-primary text-white hover:opacity-90"
              disabled={loading}
            >
              {loading 
                ? 'Loading...' 
                : mode === 'forgot'
                  ? 'Send Reset Link'
                  : mode === 'signup' 
                    ? 'Sign Up' 
                    : 'Log in'}
            </Button>
          </form>
        )}

        {mode !== 'update-password' && (
          <div className="mt-4 space-y-3">
            {mode === 'signin' && (
              <>
                {/* Google Sign In */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  style={{ backgroundColor: '#ffffff', color: '#18181b', borderColor: '#d4d4d8' }}
                  onClick={handleGoogleAuth}
                  disabled={loading}
                >
                  <GoogleIcon />
                  Log in with Google
                </Button>
                
                {/* Sign Up with Email */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  style={{ backgroundColor: '#ffffff', color: '#18181b', borderColor: '#d4d4d8' }}
                  onClick={() => setMode('signup')}
                  disabled={loading}
                >
                  Sign up with Email
                </Button>
                
                {/* Sign Up with Google */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  style={{ backgroundColor: '#ffffff', color: '#18181b', borderColor: '#d4d4d8' }}
                  onClick={handleGoogleAuth}
                  disabled={loading}
                >
                  <GoogleIcon />
                  Sign up with Google
                </Button>
              </>
            )}
            {mode === 'signup' && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                style={{ backgroundColor: '#a1a1aa', color: '#18181b', borderColor: '#a1a1aa' }}
                onClick={() => setMode('signin')}
              >
                Go back
              </Button>
            )}
            {mode === 'forgot' && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                style={{ backgroundColor: '#e4e4e7', color: '#18181b', borderColor: '#d4d4d8' }}
                onClick={() => setMode('signin')}
              >
                Back to Sign In
              </Button>
            )}
            {mode !== 'signup' && (
              <button
                type="button"
                className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors block w-full text-center"
                onClick={() => setMode('forgot')}
              >
                Forgot password?
              </button>
            )}
          </div>
        )}
        </Card>
      </div>
    </div>
  );
};

export default Auth;
