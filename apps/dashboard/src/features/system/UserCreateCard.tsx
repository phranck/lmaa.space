import { useState } from "react";
import SFDocumentOnDocument from "sf-symbols-lib/monochrome/SFDocumentOnDocument";
import SFPersonBadgePlus from "sf-symbols-lib/monochrome/SFPersonBadgePlus";
import SFPersonFill from "sf-symbols-lib/monochrome/SFPersonFill";
import SFPersonFillCheckmark from "sf-symbols-lib/monochrome/SFPersonFillCheckmark";
import SFPlusCircleFill from "sf-symbols-lib/monochrome/SFPlusCircleFill";

import type { AdminUserInvite } from "@lmaa/shared";
import { FormLabel, FormLabelText, formInputClass } from "@lmaa/ui";

import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useEmailTemplates } from "@/features/templates/hooks/useEmailTemplates.ts";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";

import { EMPTY_CREATE_USER_FORM, useCreateUser } from "./hooks/useAdminUsers.ts";
import type { CreateUserFormData } from "./hooks/useAdminUsers.ts";

interface UserCreateCardProps {
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Modal card for creating dashboard users.
 *
 * @param props - Close/create callbacks.
 * @returns User creation modal.
 */
export function UserCreateCard({ onClose, onCreated }: UserCreateCardProps) {
  const { messages } = useI18n();
  const { user } = useAuth();
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
  const [form, setForm] = useState<CreateUserFormData>({
    ...EMPTY_CREATE_USER_FORM,
    role: "admin",
  });
  const [inviteResult, setInviteResult] = useState<AdminUserInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = useCreateUser();
  const { data: emailTemplates = [] } = useEmailTemplates();
  const templateVariables = [
    {
      name: "{{username}}",
      description: usersMessages.createCard.templateVariableUsername,
    },
    {
      name: "{{email}}",
      description: usersMessages.createCard.templateVariableEmail,
    },
    {
      name: "{{role}}",
      description: usersMessages.createCard.templateVariableRole,
    },
    {
      name: "{{inviteUrl}}",
      description: usersMessages.createCard.templateVariableInviteUrl,
    },
    {
      name: "{{loginUrl}}",
      description: usersMessages.createCard.templateVariableLoginUrl,
    },
  ] as const;

  function handleSubmit() {
    createMutation.mutate(form, {
      onSuccess: (result) => {
        setInviteResult(result);
        setCopied(false);
        onCreated();
      },
    });
  }

  async function handleCopyInviteLink() {
    if (!inviteResult) return;
    try {
      await navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const canSubmit = form.username.trim().length >= 3 && form.email.trim().length > 0 && !createMutation.isPending;

  return (
    <OverlayCard
      open
      onClose={onClose}
      size={{ storageKey: "users:create-card-size" }}
      aria-label={usersMessages.createCard.title}
    >
      <OverlayCard.Header>
        <div className="flex items-center gap-3">
          <SFPersonBadgePlus className={dialogHeaderIconClass} />
          <h2 className="font-semibold text-[var(--ds-text)]">{usersMessages.createCard.title}</h2>
        </div>
      </OverlayCard.Header>

      <OverlayCard.Body className="space-y-4">
        {inviteResult ? (
          <div className="space-y-4">
            <div className="rounded-[var(--radius-card)] border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] p-4 space-y-2">
              <p className="text-sm font-medium text-[var(--ds-text)]">
                {usersMessages.createCard.inviteCreated}
              </p>
              <p className="text-sm text-[var(--ds-text-muted)]">
                {usersMessages.createCard.inviteHint}
              </p>
            </div>
            <div>
              <FormLabel htmlFor="uc-invite-url">{usersMessages.createCard.inviteLink}</FormLabel>
              <input
                id="uc-invite-url"
                type="text"
                readOnly
                value={inviteResult.inviteUrl}
                className={formInputClass}
              />
            </div>
          </div>
        ) : (
          <>
            <div>
              <FormLabelText className="mb-2">{usersMessages.createCard.role}</FormLabelText>
              <SegmentedControl
                value={form.role ?? "admin"}
                onChange={(role) => setForm((f) => ({ ...f, role }))}
                storageKey={getSegmentedStorageKey(user?.id, "users:create:role")}
                options={roleOptions}
              />
            </div>

            <div>
              <FormLabel htmlFor="uc-username">{usersMessages.createCard.username}</FormLabel>
              <input
                id="uc-username"
                type="text"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                minLength={3}
                className={formInputClass}
              />
            </div>

            <div>
              <FormLabel htmlFor="uc-email">{usersMessages.createCard.email}</FormLabel>
              <input
                id="uc-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={formInputClass}
              />
            </div>

            <p className="text-xs text-[var(--ds-text-subtle)]">
              {usersMessages.createCard.inviteFlowHint}
            </p>

            <div>
              <FormLabel htmlFor="uc-welcome-template">
                {usersMessages.createCard.welcomeTemplate}
              </FormLabel>
              <select
                id="uc-welcome-template"
                value={form.welcomeTemplateId ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    welcomeTemplateId: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className={`${formInputClass} h-9`}
              >
                <option value="">{usersMessages.createCard.welcomeTemplateNone}</option>
                {emailTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <div className="mt-3 rounded-control border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-inset)] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--ds-text-subtle)]">
                  {usersMessages.createCard.templateVariablesLabel}
                </p>
                <div className="mt-2 space-y-2">
                  {templateVariables.map((variable) => (
                    <div
                      key={variable.name}
                      className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-x-2 text-xs text-left"
                    >
                      <code className="shrink-0 rounded bg-[var(--ds-bg-elevated)] px-1.5 py-0.5 font-mono text-[var(--ds-text)]">
                        {variable.name}
                      </code>
                      <span className="text-[var(--ds-text-muted)]">{variable.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {createMutation.isError && (
              <p className="text-[var(--ds-danger-text)] text-sm">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : usersMessages.createCard.errorCreating}
              </p>
            )}
          </>
        )}
      </OverlayCard.Body>

      <OverlayCard.Footer className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 border border-[var(--ds-border)] text-[var(--ds-text-muted)] rounded-control text-sm hover:border-[var(--ds-border-strong)] transition-colors"
        >
          {common.cancel}
        </button>
        {inviteResult ? (
          <button
            type="button"
            onClick={handleCopyInviteLink}
            className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors"
          >
            <SFDocumentOnDocument className="w-3.5 h-3.5" />
            {copied ? usersMessages.createCard.inviteCopied : usersMessages.createCard.copyInvite}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors disabled:opacity-40"
          >
            <SFPlusCircleFill className="w-3.5 h-3.5" />
            {createMutation.isPending
              ? usersMessages.createCard.creating
              : usersMessages.createCard.create}
          </button>
        )}
      </OverlayCard.Footer>
    </OverlayCard>
  );
}
