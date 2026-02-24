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
 * Error Boundary to catch unhandled React render errors
 * Prevents entire app from crashing due to component errors
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
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Error Info:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4">⚠️</div>
            <h1 className="font-serif text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Etwas ist schief gelaufen
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6 break-words">
              {this.state.error?.message || "Ein unerwarteter Fehler ist aufgetreten"}
            </p>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Zur Startseite
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
