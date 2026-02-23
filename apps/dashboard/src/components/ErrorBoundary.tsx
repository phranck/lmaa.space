import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary to catch unhandled React render errors in dashboard
 * Prevents entire admin UI from crashing due to component errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[Dashboard ErrorBoundary] Caught error:", error);
    console.error("[Dashboard ErrorBoundary] Error Info:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="text-center max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-lg p-8">
            <div className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Ein Fehler ist aufgetreten
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6 break-words text-sm">
              {this.state.error?.message || "Ein unerwarteter Fehler in der Verwaltungsanwendung"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  window.location.href = "/";
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Dashboard neuladen
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                }}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
