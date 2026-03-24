import { CopyIcon, EnvelopeSimpleIcon, XCircleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { CharCounter, FormLabel, FormOptional, MarkdownEditor } from "@lmaa/ui";

import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { usePersistedTextareaHeight } from "@/lib/usePersistedTextareaHeight.ts";

export interface RejectDialogMessages {
  cancel: string;
  comment: string;
  copyUrl: string;
  optional: string;
  commentPlaceholder: string;
  rejectionLongLabel: string;
  rejectionLongPlaceholder: string;
  errorPrefix: string;
}

export interface RejectDialogNotificationProps {
  emailTemplates: Array<{ id: number; name: string }>;
  notificationTemplateId: number | undefined;
  onNotificationTemplateChange: (value: number | undefined) => void;
  notificationLabel: string;
  notificationNoneLabel: string;
  notificationHint: string;
  hasSubmitterEmail: boolean;
}

export interface RejectDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  name: string;
  url: string;
  adminNote: string;
  onAdminNoteChange: (v: string) => void;
  rejectionLongText: string;
  onRejectionLongTextChange: (v: string) => void;
  rejectionToken?: string | null;
  onSubmit: () => void;
  isPending: boolean;
  isError?: boolean;
  errorMessage?: string;
  submitLabel: string;
  submitVariant?: "danger" | "primary";
  submitIcon?: ReactNode;
  headerIcon?: ReactNode;
  headerRight?: ReactNode;
  storageKey?: string;
  adminNoteStorageKey?: string;
  rejectionLongStorageKey?: string;
  messages: RejectDialogMessages;
  notification?: RejectDialogNotificationProps;
}

export function RejectDialog({
  open,
  onClose,
  title,
  name,
  url,
  adminNote,
  onAdminNoteChange,
  rejectionLongText,
  onRejectionLongTextChange,
  rejectionToken,
  onSubmit,
  isPending,
  isError,
  errorMessage,
  submitLabel,
  submitVariant = "danger",
  submitIcon,
  headerIcon,
  headerRight,
  storageKey = "reject-dialog-size",
  adminNoteStorageKey,
  rejectionLongStorageKey,
  messages,
  notification,
}: RejectDialogProps) {
  const isDanger = submitVariant === "danger";

  function handleAdminNotePaste(event: ClipboardEvent) {
    const pastedText = event.clipboardData?.getData("text") ?? "";
    if (!pastedText.includes("[REJECT_TOKEN]") || !rejectionToken) return;
    event.preventDefault();
    onAdminNoteChange(`${adminNote}${pastedText.replace(/\[REJECT_TOKEN\]/g, rejectionToken)}`);
  }

  usePersistedTextareaHeight(
    "reject-note",
    adminNoteStorageKey ?? "",
    !!adminNoteStorageKey && open,
  );
  usePersistedTextareaHeight(
    "reject-long",
    rejectionLongStorageKey ?? "",
    !!rejectionLongStorageKey && open,
  );

  return (
    <OverlayCard
      open={open}
      onClose={onClose}
      size={{ storageKey, defaultWidth: 512 }}
      aria-label={title}
    >
      <OverlayCard.Header>
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {headerIcon ?? <XCircleIcon weight="duotone" className={dialogHeaderIconClass} />}
            <h3 className="font-bold text-[var(--ds-text)]">{title}</h3>
          </div>
          {headerRight}
        </div>
        <p className="text-sm text-[var(--ds-text-muted)] mt-0.5">{name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <p className="text-xs text-[var(--ds-text-subtle)] truncate">{url}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(url)}
            className="shrink-0 ml-auto p-1 rounded text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)] transition-colors"
            aria-label={messages.copyUrl}
          >
            <CopyIcon weight="duotone" className="w-4 h-4" />
          </button>
        </div>
      </OverlayCard.Header>

      <OverlayCard.Body className="flex flex-col gap-3">
        <div>
          <FormLabel htmlFor="reject-note">
            {messages.comment} <FormOptional>{messages.optional}</FormOptional>
          </FormLabel>
          <MarkdownEditor
            id="reject-note"
            value={adminNote}
            onChange={onAdminNoteChange}
            onPaste={handleAdminNotePaste}
            rows={3}
            resizable
            placeholder={messages.commentPlaceholder}
          />
          <CharCounter value={adminNote} max={1200} className="block mt-1 text-right" />
        </div>

        <div>
          <FormLabel htmlFor="reject-long">
            {messages.rejectionLongLabel} <FormOptional>{messages.optional}</FormOptional>
          </FormLabel>
          <MarkdownEditor
            id="reject-long"
            value={rejectionLongText}
            onChange={onRejectionLongTextChange}
            rows={6}
            resizable
            placeholder={messages.rejectionLongPlaceholder}
          />
        </div>

        {notification && (
          <NotificationTemplateSelect
            emailTemplates={notification.emailTemplates}
            notificationTemplateId={notification.notificationTemplateId}
            onNotificationTemplateChange={notification.onNotificationTemplateChange}
            notificationLabel={notification.notificationLabel}
            notificationNoneLabel={notification.notificationNoneLabel}
            notificationHint={notification.notificationHint}
            hasSubmitterEmail={notification.hasSubmitterEmail}
          />
        )}

        {isError && (
          <p className="text-sm text-red-600">
            {messages.errorPrefix} {errorMessage}
          </p>
        )}
      </OverlayCard.Body>

      <OverlayCard.Footer className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="py-1.5 px-4 border border-[var(--ds-border)] text-[var(--ds-text-muted)] rounded-control text-sm hover:border-[var(--ds-border-strong)] transition-colors"
        >
          {messages.cancel}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending}
          className={`flex items-center gap-2 py-1.5 px-4 border rounded-control text-sm font-medium transition-colors disabled:opacity-60 ${
            isDanger
              ? "border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)]"
              : "border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)]"
          }`}
        >
          {submitIcon ?? <XCircleIcon weight="duotone" className="w-3.5 h-3.5" />}
          {isPending ? "…" : submitLabel}
        </button>
      </OverlayCard.Footer>
    </OverlayCard>
  );
}

export interface NotificationTemplateSelectProps {
  emailTemplates: Array<{ id: number; name: string }>;
  notificationTemplateId: number | undefined;
  onNotificationTemplateChange: (value: number | undefined) => void;
  notificationLabel: string;
  notificationNoneLabel: string;
  notificationHint: string;
  hasSubmitterEmail: boolean;
}

export function NotificationTemplateSelect({
  emailTemplates,
  notificationTemplateId,
  onNotificationTemplateChange,
  notificationLabel,
  notificationNoneLabel,
  notificationHint,
  hasSubmitterEmail,
}: NotificationTemplateSelectProps) {
  return (
    <div className="rounded-lg border border-[var(--ds-border)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <EnvelopeSimpleIcon weight="duotone" className="w-4 h-4 text-[var(--ds-text-muted)]" />
        <span className="text-sm font-medium text-[var(--ds-text)]">{notificationLabel}</span>
      </div>
      <select
        value={notificationTemplateId ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          onNotificationTemplateChange(val ? Number(val) : undefined);
        }}
        disabled={!hasSubmitterEmail}
        className="w-full h-9 px-3 border border-[var(--ds-border)] rounded-control bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] disabled:opacity-50"
      >
        <option value="">{notificationNoneLabel}</option>
        {emailTemplates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {!hasSubmitterEmail && (
        <p className="text-xs text-[var(--ds-text-subtle)] mt-1.5">{notificationHint}</p>
      )}
    </div>
  );
}
