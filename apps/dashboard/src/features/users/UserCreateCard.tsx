import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useEffect, useState } from "react";
import { SFPersonBadgePlus, SFPersonFill, SFPersonFillCheckmark } from "sf-symbols-lib/monochrome";
import { EMPTY_CREATE_USER_FORM, useCreateUser } from "./hooks/useAdminUsers.ts";
import type { CreateUserFormData } from "./hooks/useAdminUsers.ts";

interface UserCreateCardProps {
  onClose: () => void;
  onCreated: () => void;
}

const inputClass =
  "w-full h-9 px-3 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

export function UserCreateCard({ onClose, onCreated }: UserCreateCardProps) {
  const { messages } = useI18n();
  const common = messages.common;
  const usersMessages = messages.users;
  const roleOptions = [
    {
      value: "admin" as const,
      label: usersMessages.role.admin,
      icon: <SFPersonFill className="w-3.5 h-3.5" />,
    },
    {
      value: "moderator" as const,
      label: usersMessages.role.moderator,
      icon: <SFPersonFillCheckmark className="w-3.5 h-3.5" />,
    },
  ] as const;
  const [closing, setClosing] = useState(false);
  const [form, setForm] = useState<CreateUserFormData>({
    ...EMPTY_CREATE_USER_FORM,
    role: "admin",
  });

  const createMutation = useCreateUser();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function close() {
    setClosing(true);
    setTimeout(onClose, 280);
  }

  function handleSubmit() {
    createMutation.mutate(form, { onSuccess: onCreated });
  }

  const canSubmit =
    form.username.trim().length >= 3 &&
    form.email.trim().length > 0 &&
    form.password.length >= 8 &&
    !createMutation.isPending;

  return (
    <div
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4 ${closing ? "overlay-backdrop-exit" : "overlay-backdrop-enter"}`}
    >
      <button
        type="button"
        aria-label={usersMessages.createCard.closeAria}
        className="absolute inset-0"
        onClick={close}
      />
      <div
        className={`relative bg-[var(--ds-surface)] rounded-[var(--radius-card)] shadow-2xl w-full max-w-md overflow-hidden ${closing ? "overlay-card-exit" : "overlay-card-enter"}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--ds-border-subtle)]">
          <SFPersonBadgePlus className="w-5 h-5 text-[var(--ds-text-muted)]" />
          <h2 className="font-semibold text-[var(--ds-text)]">{usersMessages.createCard.title}</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Rolle */}
          <div>
            <p className="block text-sm font-medium text-[var(--ds-text)] mb-2">
              {usersMessages.createCard.role}
            </p>
            <SegmentedControl
              value={form.role ?? "admin"}
              onChange={(role) => setForm((f) => ({ ...f, role }))}
              options={roleOptions}
            />
          </div>

          {/* Benutzername */}
          <div>
            <label
              htmlFor="uc-username"
              className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
            >
              {usersMessages.createCard.username}
            </label>
            <input
              id="uc-username"
              type="text"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              minLength={3}
              className={inputClass}
            />
          </div>

          {/* E-Mail */}
          <div>
            <label
              htmlFor="uc-email"
              className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
            >
              {usersMessages.createCard.email}
            </label>
            <input
              id="uc-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputClass}
            />
          </div>

          {/* Passwort */}
          <div>
            <label
              htmlFor="uc-password"
              className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
            >
              {usersMessages.createCard.tempPassword}
            </label>
            <input
              id="uc-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              minLength={8}
              className={inputClass}
            />
            <p className="text-xs text-[var(--ds-text-subtle)] mt-1.5">
              {usersMessages.createCard.minLengthHint}
            </p>
          </div>

          {createMutation.isError && (
            <p className="text-[var(--ds-danger-text)] text-sm">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : usersMessages.createCard.errorCreating}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--ds-border-subtle)]">
          <button
            type="button"
            onClick={close}
            className="h-9 px-4 border border-[var(--ds-border)] text-[var(--ds-text-muted)] rounded-control text-sm hover:border-[var(--ds-border-strong)] transition-colors"
          >
            {common.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-9 px-4 bg-[var(--ds-btn-primary-bg)] text-[var(--ds-btn-primary-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] transition-colors disabled:opacity-40"
          >
            {createMutation.isPending
              ? usersMessages.createCard.creating
              : usersMessages.createCard.create}
          </button>
        </div>
      </div>
    </div>
  );
}
