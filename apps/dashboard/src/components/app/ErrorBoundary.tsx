import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { resolveInitialLocale } from "@/context/I18nContext.tsx";
import { DASHBOARD_MESSAGES } from "@/i18n/messages.ts";

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
/**
 * Global React error boundary for dashboard routes.
 *
 * Hidden behavior: logs runtime errors to console and renders a fallback card
 * instead of crashing the whole SPA tree.
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
      const locale = resolveInitialLocale();
      const boundaryMessages = DASHBOARD_MESSAGES[locale].errors.boundary;

      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--ds-bg)] p-4">
          <div className="max-w-md rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] p-8 text-center shadow-[var(--ds-overlay-shadow)]">
            <div className="mb-4 text-4xl font-semibold text-[var(--ds-danger-text)]">
              ⚠️
            </div>
            <h1 className="mb-2 text-2xl font-semibold text-[var(--ds-text)]">
              {boundaryMessages.title}
            </h1>
            <p className="mb-6 break-words text-sm text-[var(--ds-text-muted)]">
              {this.state.error?.message || boundaryMessages.fallbackMessage}
            </p>
            <div className="flex gap-3">
              <DashboardButton
                className="flex-1"
                onClick={() => {
                  window.location.href = "/";
                }}
                size="control"
                variant="primary"
              >
                {boundaryMessages.reload}
              </DashboardButton>
              <DashboardButton
                className="flex-1"
                onClick={() => {
                  this.setState({ hasError: false });
                }}
                size="control"
                variant="neutral"
              >
                {boundaryMessages.retry}
              </DashboardButton>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
