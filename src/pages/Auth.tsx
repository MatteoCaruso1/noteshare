import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Music } from 'lucide-react';

const Auth = () => {
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate('/');
    return null;
  }

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-card border-border">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
            <Music className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold">noteshare</h1>
          <p className="text-muted-foreground mt-1">
            {mode === 'forgot' 
              ? 'Reset your password' 
              : mode === 'signup' 
                ? 'Create your account' 
                : 'Welcome back'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {mode !== 'forgot' && (
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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
                Remember me
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
      </Card>
    </div>
  );
};

export default Auth;
