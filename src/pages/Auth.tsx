import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Music } from 'lucide-react';
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

  // Listen for password recovery event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update-password');
      }
    });

    // Check if arriving from reset link
    if (searchParams.get('reset') === 'true') {
      // The user might already be in recovery mode
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setMode('update-password');
        }
      });
    }

    return () => subscription.unsubscribe();
  }, [searchParams]);

  // Only redirect if user is logged in AND not in password update mode
  if (user && mode !== 'update-password') {
    navigate('/');
    return null;
  }

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
      default: return 'Welcome back';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-card border-border">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
            <Music className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold">noteshare</h1>
          <p className="text-muted-foreground mt-1">{getTitle()}</p>
        </div>

        {mode === 'update-password' ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <Button
              type="submit"
              className="w-full bg-gradient-primary text-primary-foreground"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
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
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                name="password"
              />
            )}
            {mode === 'signin' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  Stay signed in on this device
                </Label>
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-primary text-primary-foreground"
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
          <div className="mt-6 text-center space-y-2">
            {mode === 'signin' && (
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors block w-full"
                onClick={() => setMode('forgot')}
              >
                Forgot your password?
              </button>
            )}
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors block w-full"
              onClick={() => setMode(mode === 'signup' ? 'signin' : mode === 'forgot' ? 'signin' : 'signup')}
            >
              {mode === 'signup'
                ? 'Already have an account? Sign in'
                : mode === 'forgot'
                  ? 'Back to sign in'
                  : "Don't have an account? Sign up"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Auth;
