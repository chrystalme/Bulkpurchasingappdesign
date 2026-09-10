import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Changing this clears a caught error. Pass the current screen so navigating
   * away from a broken screen recovers automatically.
   */
  resetKey?: unknown;
  /** Optional escape hatch shown in the fallback. */
  onGoHome?: () => void;
  /** Console-only label for debugging (never rendered). */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render errors in its subtree so one broken screen cannot blank the
 * whole application. The fallback stays generic on purpose — no error message,
 * stack or component name is shown to the user; the real error goes to the
 * console for debugging.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[ErrorBoundary] caught in ${this.props.label ?? 'subtree'}:`,
      error,
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private handleRetry = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center p-6">
        <Card className="p-6 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-[#FB7185]/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-[#FB7185]" />
          </div>
          <h2 className="font-semibold text-gray-900 mb-1">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-600 mb-5">
            We couldn't display this screen. Nothing was lost — try again, or head
            back home.
          </p>
          <div className="space-y-2">
            <Button
              onClick={this.handleRetry}
              className="w-full bg-[#0047AB] hover:bg-[#003D96] text-white"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Try again
            </Button>
            {this.props.onGoHome && (
              <Button
                variant="outline"
                onClick={this.props.onGoHome}
                className="w-full"
              >
                Back to home
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }
}
