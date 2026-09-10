import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Brand, BrandMark } from '../brand/Brand';
import { isValidEmail } from '../../lib/sanitizer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';

interface LoginProps {
  onNavigateToSignup: () => void;
  /** Optional — lets the user leave the auth screen and keep browsing. */
  onNavigateHome?: () => void;
}

const validateEmail = (email: string): boolean => {
  return isValidEmail(email);
};

const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

interface ValidationErrors {
  email?: string;
  password?: string;
}

export function Login({ onNavigateToSignup, onNavigateHome }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!resetEmail.trim()) {
      setResetError('Email is required');
      return;
    }
    if (!validateEmail(resetEmail)) {
      setResetError('Please enter a valid email address');
      return;
    }
    setResetLoading(true);
    setTimeout(() => {
      setResetLoading(false);
      setResetSent(true);
    }, 600);
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      errors.password = 'Password must be at least 6 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (validationErrors.email) {
      if (value && validateEmail(value)) {
        setValidationErrors(prev => ({ ...prev, email: undefined }));
      }
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (validationErrors.password) {
      if (value && validatePassword(value)) {
        setValidationErrors(prev => ({ ...prev, password: undefined }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || 'Invalid credentials');
    }

    setIsLoading(false);
  };

  const isFormValid =
    email.trim() &&
    password &&
    validateEmail(email) &&
    validatePassword(password);

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
    <div className="min-h-screen bg-gradient-to-br from-[#0047AB] via-[#0047AB] to-[#6EE7B7] flex flex-col">
      {/* ── APP HEADER ── matches the landing page nav so guests always know
          where they are and can step back to browsing. */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#0047AB]/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={onNavigateHome}
            className="cursor-pointer"
            title="Back to home"
          >
            <Brand size="md" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNavigateToSignup}
              className="text-sm font-medium text-[#0047AB] px-3 py-1.5 rounded-lg hover:bg-[#EBF1FB] transition-colors"
            >
              Create account
            </button>
            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="flex items-center gap-1.5 text-[#0047AB] text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-[#EBF1FB] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
        {/* Logo and Welcome */}
        <div className="text-center mb-8">
          <BrandMark size="hero" tone="inverse" className="mx-auto mb-4" />
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
                    onChange={handleEmailChange}
                    className={`pl-9 ${validationErrors.email ? 'border-red-500' : ''}`}
                    required
                    autoComplete="email"
                  />
                  {validationErrors.email && (
                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                  )}
                  {email && !validationErrors.email && validateEmail(email) && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.email}
                  </p>
                )}
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
                    onChange={handlePasswordChange}
                    className={`pl-9 pr-10 ${validationErrors.password ? 'border-red-500' : ''}`}
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
                {validationErrors.password && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90 h-11 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  onClick={() => {
                    setResetEmail(email || '');
                    setResetSent(false);
                    setResetError('');
                    setShowForgotPassword(true);
                  }}
                  className="text-sm text-[#0047AB] hover:underline cursor-pointer"
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

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#0047AB]">
              Reset Your Password
            </DialogTitle>
            <DialogDescription>
              Enter the email address associated with your account and we will send you instructions to reset your password.
            </DialogDescription>
          </DialogHeader>

          {resetSent ? (
            <div className="space-y-4 py-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm">
                  Reset link sent to <span className="font-semibold">{resetEmail}</span>. Please check your inbox and spam folder.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90 text-white"
              >
                Return to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-4 py-2">
              {resetError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-xs">{resetError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Account Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetLoading}
                  className="bg-[#0047AB] hover:bg-[#0047AB]/90 text-white"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      </main>
    </div>
  );
}
