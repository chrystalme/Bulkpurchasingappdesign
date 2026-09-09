import { AlertCircle, Home } from 'lucide-react';
import { Button } from './button';

interface AccessDeniedProps {
  message?: string;
  showHomeButton?: boolean;
  onNavigateHome?: () => void;
}

/**
 * AccessDenied Component
 * 
 * Displays when user doesn't have permission to view a page/resource
 * Shows helpful message and option to go home
 */
export function AccessDenied({
  message = "You don't have permission to view this page",
  showHomeButton = true,
  onNavigateHome,
}: AccessDeniedProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0047AB] to-[#6EE7B7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          {/* Message */}
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-center text-gray-600 mb-6">
            {message}
          </p>

          {/* Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>Why?</strong> Your account role doesn't have permission to access this resource.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              If you believe this is an error, please contact support.
            </p>
          </div>

          {/* Button */}
          {showHomeButton && (
            <Button
              onClick={onNavigateHome}
              className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90 flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Go to Home
            </Button>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-xs mt-6">
          Status: 403 Forbidden
        </p>
      </div>
    </div>
  );
}
