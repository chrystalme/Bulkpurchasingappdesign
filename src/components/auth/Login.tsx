import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Eye,
  EyeOff,
  ShoppingBag,
  Lock,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginProps {
  onNavigateToSignup: () => void;
}

export function Login({ onNavigateToSignup }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || 'Invalid credentials');
    }

    setIsLoading(false);
  };

  // Demo credentials
  const demoAccounts = [
    { email: 'super@admin.com', password: 'password123', role: 'Super User' },
    { email: 'admin@savetogether.com', password: 'password123', role: 'Admin' },
    { email: 'vendor@solartech.com', password: 'password123', role: 'Vendor' },
    { email: 'afam@example.com', password: 'password123', role: 'Member' },
  ];

  const fillDemo = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0047AB] via-[#0047AB] to-[#6EE7B7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Welcome */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShoppingBag className="w-10 h-10 text-[#0047AB]" />
          </div>
          <h1 className="text-white mb-2">Welcome Back</h1>
          <p className="text-white/80">Save Together, Buy Smarter</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-9 pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90 h-11"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-[#0047AB] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600 mb-3">
                Don't have an account?{' '}
                <button
                  onClick={onNavigateToSignup}
                  className="text-[#0047AB] hover:underline font-medium"
                >
                  Sign up
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Demo Accounts */}
        <Card className="mt-4 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-700 mb-3 text-center">
              🔓 Demo Accounts - Click to fill
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map(account => (
                <Button
                  key={account.email}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillDemo(account.email, account.password)}
                  className="text-xs h-auto py-2 px-2"
                >
                  <div className="text-left w-full">
                    <div className="font-medium">{account.role}</div>
                    <div className="text-gray-500 text-[10px] truncate">
                      {account.email}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-white/60 text-xs mt-6">
          By signing in, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
