import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from './card';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Failed to load data. Please try again.',
  onRetry,
  showRetry = true,
}: ErrorStateProps) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-6">
        <Alert variant="destructive">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold">{title}</h4>
              <AlertDescription>{description}</AlertDescription>
            </div>
          </div>
        </Alert>
        {showRetry && onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  title = 'No data found',
  description = 'There are no items to display.',
  icon: Icon = AlertCircle,
}: {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Icon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-gray-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

interface FormErrorProps {
  error?: string | null;
}

export function FormError({ error }: FormErrorProps) {
  if (!error) return null;
  
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
