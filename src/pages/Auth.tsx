import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Music, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Auth = () => {
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'update-password'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Listen for password recovery event and handle URL hash tokens
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] Auth state changed:', event);
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[Auth] Password recovery event detected');
        setMode('update-password');
      }
    });

    // Parse URL hash for recovery tokens (Supabase puts tokens in hash fragment)
    const hashFragment = window.location.hash;
    if (hashFragment) {
      const hashParams = new URLSearchParams(hashFragment.substring(1));
      const accessToken = hashParams.get('access_token');
      const tokenType = hashParams.get('type');
      const refreshToken = hashParams.get('refresh_token');
      
      console.log('[Auth] Hash params detected - type:', tokenType);
      
      if (accessToken && tokenType === 'recovery') {
        console.log('[Auth] Recovery token found in URL hash, setting session');
        // Set the session from the recovery tokens
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        }).then(({ error }) => {
          if (error) {
            console.error('[Auth] Error setting session from recovery token:', error);
            toast.error('Password reset link has expired. Please request a new one.');
          } else {
            console.log('[Auth] Session set successfully, switching to update-password mode');
            setMode('update-password');
            // Clear the hash from the URL for cleaner appearance
            window.history.replaceState(null, '', window.location.pathname);
          }
        });
      }
    }

    // Also check for reset=true search param (fallback)
    if (searchParams.get('reset') === 'true') {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          console.log('[Auth] Session found with reset param, switching to update-password');
          setMode('update-password');
        }
      });
    }

    return () => subscription.unsubscribe();
  }, [searchParams]);

  // Reset password touched state when mode changes
  useEffect(() => {
    setPasswordTouched(false);
  }, [mode]);

  // Only redirect if user is logged in AND not in password update mode
  if (user && mode !== 'update-password') {
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
    
    // Custom validation for password
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
        navigate('/');
      } else {
        await signIn(email, password, rememberMe);
        navigate('/');
      }
    } catch (error) {
      // Error is handled in useAuth
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-auth-enter">
      <Card className="w-full max-w-md p-8 bg-card border-border">
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
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="h-5 w-5"
                />
                <span className="text-sm text-muted-foreground">
                  Stay signed in
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
                    : 'Sign In'}
            </Button>
          </form>
        )}

        {mode !== 'update-password' && (
          <div className="mt-4 space-y-3">
            {mode === 'signin' && (
              <Button
                type="button"
                variant="outline"
                className="w-full bg-zinc-200 text-zinc-900 hover:bg-zinc-300 border-zinc-300 transform-gpu"
                onClick={() => setMode('signup')}
              >
                Sign Up
              </Button>
            )}
            {mode === 'signup' && (
              <Button
                type="button"
                variant="outline"
                className="w-full bg-zinc-400 text-zinc-900 hover:bg-zinc-500 border-zinc-400"
                onClick={() => setMode('signin')}
              >
                Go back
              </Button>
            )}
            {mode === 'forgot' && (
              <Button
                type="button"
                variant="outline"
                className="w-full bg-zinc-200 text-zinc-900 hover:bg-zinc-300 border-zinc-300"
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
  );
};

export default Auth;
