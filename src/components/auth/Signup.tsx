import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Eye, EyeOff, ShoppingBag, Lock, Mail, User, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SignupProps {
  onNavigateToLogin: () => void;
}

const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validateName = (name: string): boolean => {
  return name.trim().length >= 2;
};

const validatePasswordStrength = (password: string) => {
  const hasMinLength = password.length >= 6;
  const hasMaxLength = password.length <= 128;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const strength =
    hasMinLength && hasMaxLength
      ? hasNumber && (hasUppercase || hasLowercase)
        ? hasUppercase && hasLowercase && hasNumber
          ? 'strong'
          : 'medium'
        : 'weak'
      : 'weak';

  return { strength, requirements: { hasMinLength, hasUppercase, hasLowercase, hasNumber } };
};

interface ValidationErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function Signup({ onNavigateToLogin }: SignupProps) {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const passwordStrength = validatePasswordStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!name.trim()) {
      errors.name = 'Name is required';
    } else if (!validateName(name)) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (validationErrors.name && value && validateName(value)) {
      setValidationErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (validationErrors.email && value && validateEmail(value)) {
      setValidationErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (validationErrors.password && value && value.length >= 6) {
      setValidationErrors(prev => ({ ...prev, password: undefined }));
    }
    if (validationErrors.confirmPassword && confirmPassword === value) {
      setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (validationErrors.confirmPassword && value === password) {
      setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    const result = await signup(email, password, name.trim(), 'member');

    if (!result.success) {
      setError(result.error || 'Signup failed');
    }

    setIsLoading(false);
  };

  const isFormValid =
    name.trim() &&
    email.trim() &&
    password &&
    confirmPassword &&
    validateName(name) &&
    validateEmail(email) &&
    password.length >= 6 &&
    password === confirmPassword;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0047AB] via-[#0047AB] to-[#6EE7B7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Welcome */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShoppingBag className="w-10 h-10 text-[#0047AB]" />
          </div>
          <h1 className="text-white mb-2">Create Account</h1>
          <p className="text-white/80">Join us and start saving together</p>
        </div>

        {/* Signup Card */}
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
                <Label htmlFor="name">Full Name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={handleNameChange}
                    className={`pl-9 ${validationErrors.name ? 'border-red-500' : ''}`}
                    required
                    autoComplete="name"
                  />
                  {validationErrors.name && (
                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                  )}
                  {name && !validationErrors.name && validateName(name) && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.name}
                  </p>
                )}
              </div>

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
                    autoComplete="new-password"
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

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    className={`pl-9 ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
                    required
                    autoComplete="new-password"
                  />
                  {validationErrors.confirmPassword && (
                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                  )}
                  {confirmPassword && !validationErrors.confirmPassword && passwordsMatch && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Password Strength Indicator and Requirements */}
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600">Password Strength:</span>
                    <div className="flex gap-1 flex-1">
                      <div
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          passwordStrength.strength === 'strong'
                            ? 'bg-green-500'
                            : passwordStrength.strength === 'medium'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                      />
                      <div
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          passwordStrength.strength === 'strong' || passwordStrength.strength === 'medium'
                            ? passwordStrength.strength === 'strong'
                              ? 'bg-green-500'
                              : 'bg-yellow-500'
                            : 'bg-gray-200'
                        }`}
                      />
                      <div
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          passwordStrength.strength === 'strong' ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength.strength === 'strong'
                          ? 'text-green-600'
                          : passwordStrength.strength === 'medium'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }`}
                    >
                      {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div
                      className={`flex items-center gap-2 ${
                        passwordStrength.requirements.hasMinLength ? 'text-[#10B981]' : 'text-gray-500'
                      }`}
                    >
                      <CheckCircle2 className={`w-3 h-3 ${passwordStrength.requirements.hasMinLength ? '' : 'opacity-50'}`} />
                      <span>At least 6 characters</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 ${
                        passwordStrength.requirements.hasUppercase ? 'text-[#10B981]' : 'text-gray-500'
                      }`}
                    >
                      <CheckCircle2 className={`w-3 h-3 ${passwordStrength.requirements.hasUppercase ? '' : 'opacity-50'}`} />
                      <span>One uppercase letter</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 ${
                        passwordStrength.requirements.hasLowercase ? 'text-[#10B981]' : 'text-gray-500'
                      }`}
                    >
                      <CheckCircle2 className={`w-3 h-3 ${passwordStrength.requirements.hasLowercase ? '' : 'opacity-50'}`} />
                      <span>One lowercase letter</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 ${
                        passwordStrength.requirements.hasNumber ? 'text-[#10B981]' : 'text-gray-500'
                      }`}
                    >
                      <CheckCircle2 className={`w-3 h-3 ${passwordStrength.requirements.hasNumber ? '' : 'opacity-50'}`} />
                      <span>One number</span>
                    </div>
                  </div>

                  {confirmPassword && (
                    <div
                      className={`flex items-center gap-2 text-xs pt-1 border-t border-gray-200 ${
                        passwordsMatch ? 'text-[#10B981]' : 'text-gray-500'
                      }`}
                    >
                      <CheckCircle2 className={`w-3 h-3 ${passwordsMatch ? '' : 'opacity-50'}`} />
                      <span>Passwords match</span>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90 h-11 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={onNavigateToLogin}
                  className="text-[#0047AB] hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="mt-4 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span>Join or create purchasing groups</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span>Save up to 40% on bulk purchases</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span>Secure escrow protection</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-white/60 text-xs mt-6">
          By creating an account, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
