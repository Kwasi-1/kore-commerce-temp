import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error:', error, errorInfo);
  }

  private handleReload = () => {
    sessionStorage.setItem('page_chunk_reload', 'true');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message?.includes('import') ||
        this.state.error?.message?.includes('MIME type') ||
        this.state.error?.name === 'TypeError';

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-header font-bold text-lg text-foreground">
                {isChunkError ? 'Application Updated' : 'Something went wrong'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isChunkError
                  ? 'A new version of the application was deployed. Click refresh below to load the latest update.'
                  : 'An unexpected error occurred while rendering this page.'}
              </p>
            </div>
            <Button
              onClick={this.handleReload}
              className="w-full gap-2 font-bold"
              color="primary"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
