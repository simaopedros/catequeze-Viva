import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
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
    // Log to monitoring service in production
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

      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="inline-flex rounded-full bg-destructive/10 p-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Algo correu mal</h1>
              <p className="text-sm text-muted-foreground">
                Ocorreu um erro inesperado. Isto pode ser temporário — tente recarregar a página.
              </p>
              {this.state.error && (
                <details className="mt-3 text-left">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Detalhes técnicos
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
                Recarregar página
              </Button>
              <Button onClick={this.handleRetry}>
                Tentar novamente
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Se o problema persistir, contacte o suporte em suporte@catequeseviva.com
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
