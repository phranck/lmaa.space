import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import type { AdminInviteState, AdminUser } from "@lmaa/shared";

import { useI18n } from "@/context/I18nContext.tsx";
import { AuthBackground } from "@/features/auth/AuthBackground.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { api } from "@/lib/api.ts";

const inputClassName =
  "w-full h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

/**
 * Public password-setup page for invited dashboard users.
 *
 * @returns Invite acceptance screen.
 */
export function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { messages } = useI18n();
  const common = messages.common;
  const inviteMessages = messages.auth.invite;

  const [inviteState, setInviteState] = useState<AdminInviteState | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      if (!token) {
        setError(inviteMessages.invalidLink);
        setIsLoading(false);
        return;
      }

      try {
        const state = await api.get<AdminInviteState>(`/admin/invite/${token}`);
        if (!cancelled) {
          setInviteState(state);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : inviteMessages.invalidLink);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadInvite();
    return () => {
      cancelled = true;
    };
  }, [inviteMessages.invalidLink, token]);

  async function handleSubmit() {
    if (!token || password.length < 8) return;
    if (password !== confirmPassword) {
      setError(inviteMessages.passwordMismatch);
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await api.post<AdminUser>("/admin/invite/accept", { token, password });
      await refresh();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : common.unknownError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthBackground>
      <div className="w-full max-w-sm">
        <div className="bg-[var(--ds-surface)] rounded-[var(--radius-card)] shadow-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
          <div className="bg-[var(--ds-surface-inset)] border-b border-[var(--ds-border-subtle)] px-5 py-4">
            <h2 className="font-bold text-[var(--ds-text)]">{inviteMessages.title}</h2>
          </div>

          <div className="px-5 py-4 flex flex-col gap-4">
            {isLoading ? (
              <p className="text-sm text-[var(--ds-text-muted)]">{common.loading}</p>
            ) : inviteState ? (
              <>
                <p className="text-sm text-[var(--ds-text-muted)]">{inviteMessages.subtitle}</p>

                <div className="rounded-[var(--radius-card)] border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] p-3">
                  <p className="font-medium text-[var(--ds-text)]">{inviteState.username}</p>
                  <p className="text-sm text-[var(--ds-text-muted)]">{inviteState.email}</p>
                </div>

                <div>
                  <label
                    htmlFor="invite-password"
                    className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
                  >
                    {inviteMessages.password}
                  </label>
                  <input
                    id="invite-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="invite-password-confirm"
                    className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
                  >
                    {inviteMessages.confirmPassword}
                  </label>
                  <input
                    id="invite-password-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    className={inputClassName}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--ds-text-muted)]">
                {error || inviteMessages.invalidLink}
              </p>
            )}

            {error && inviteState && <p className="text-red-500 text-sm">{error}</p>}
          </div>

          <div className="bg-[var(--ds-surface-inset)] border-t border-[var(--ds-border-subtle)] px-5 py-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="h-9 px-4 border border-[var(--ds-border)] text-[var(--ds-text-muted)] rounded-control text-sm hover:border-[var(--ds-border-strong)] transition-colors"
            >
              {inviteMessages.toLogin}
            </button>
            {inviteState && (
              <button
                type="button"
                disabled={isSubmitting || password.length < 8 || confirmPassword.length < 8}
                onClick={handleSubmit}
                className="h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors disabled:opacity-60"
              >
                {isSubmitting ? inviteMessages.submitLoading : inviteMessages.submit}
              </button>
            )}
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}
