import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import i18n from '../../i18n/config';
import { Button } from './ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const t = (key: string) => i18n.t(key, { ns: 'components' });

      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="inline-flex rounded-full bg-destructive/10 p-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('error_boundary.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('error_boundary.description')}</p>
              {this.state.error && (
                <details className="mt-3 text-left">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    {t('error_boundary.technical_details')}
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                    {this.state.error.message}
                    {'\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('error_boundary.reload')}
              </Button>
              <Button onClick={this.handleRetry}>{t('error_boundary.retry')}</Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('error_boundary.support')}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
