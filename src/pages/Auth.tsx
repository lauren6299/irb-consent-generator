import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = isSignUp
      ? await signUp(email, password, fullName)
      : await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else if (isSignUp) {
      toast({ title: 'Account created', description: 'Check your email for a confirmation link.' });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 mb-4">
            <span className="font-heading text-lg font-bold text-primary-foreground tracking-wide">STANFORD</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">IRB Consent Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">Rules-based consent form assembly</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">{isSignUp ? 'Create Account' : 'Sign In'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Final IRB and institutional review required before use
        </p>
      </div>
    </div>
  );
}
