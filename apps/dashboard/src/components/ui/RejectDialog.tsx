import { EnvelopeSimpleIcon, XCircleIcon } from "@phosphor-icons/react";
import { Suspense, lazy, type ReactNode } from "react";

import { CharCounter } from "@lmaa/ui/char-counter";
import { FormLabel, FormOptional } from "@lmaa/ui/form-primitives";

const MarkdownEditor = lazy(() =>
  import("@lmaa/ui/markdown-editor").then((m) => ({ default: m.MarkdownEditor })),
);

import {
  CancelActionButton,
  CopyActionButton,
  DashboardActionButton,
  SaveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { DashboardCombobox } from "@/components/ui/DashboardControls.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { usePersistedTextareaHeight } from "@/lib/hooks/usePersistedTextareaHeight.ts";

interface RejectDialogMessages {
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
            <h3 className="font-semibold text-[var(--ds-text)]">{title}</h3>
          </div>
          {headerRight}
        </div>
        <p className="text-sm text-[var(--ds-text-muted)] mt-0.5">{name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <p className="text-xs text-[var(--ds-text-hint)] truncate">{url}</p>
          <CopyActionButton
            iconOnly
            label={messages.copyUrl}
            onClick={() => navigator.clipboard.writeText(url)}
            className="ml-auto"
            aria-label={messages.copyUrl}
          />
        </div>
      </OverlayCard.Header>

      <OverlayCard.Body className="flex flex-col gap-3">
        <div>
          <FormLabel htmlFor="reject-note">
            {messages.comment} <FormOptional>{messages.optional}</FormOptional>
          </FormLabel>
          <Suspense
            fallback={
              <div className="h-[4.5rem] rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] animate-pulse" />
            }
          >
            <MarkdownEditor
              id="reject-note"
              value={adminNote}
              onChange={onAdminNoteChange}
              onPaste={handleAdminNotePaste}
              rows={3}
              resizable
              placeholder={messages.commentPlaceholder}
            />
          </Suspense>
          <CharCounter value={adminNote} max={1200} className="block mt-1 text-right" />
        </div>

        <div>
          <FormLabel htmlFor="reject-long">
            {messages.rejectionLongLabel} <FormOptional>{messages.optional}</FormOptional>
          </FormLabel>
          <Suspense
            fallback={
              <div className="h-[9rem] rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] animate-pulse" />
            }
          >
            <MarkdownEditor
              id="reject-long"
              value={rejectionLongText}
              onChange={onRejectionLongTextChange}
              rows={6}
              resizable
              placeholder={messages.rejectionLongPlaceholder}
            />
          </Suspense>
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
        <CancelActionButton label={messages.cancel} onClick={onClose} />
        {isDanger ? (
          <DashboardActionButton
            action="reject"
            onClick={onSubmit}
            disabled={isPending}
            icon={submitIcon}
            label={isPending ? "…" : submitLabel}
          />
        ) : (
          <SaveActionButton
            onClick={onSubmit}
            disabled={isPending}
            label={isPending ? "…" : submitLabel}
          />
        )}
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
        <EnvelopeSimpleIcon weight="duotone" className="size-4 text-[var(--ds-text-muted)]" />
        <span className="text-sm font-medium text-[var(--ds-text)]">{notificationLabel}</span>
      </div>
      <DashboardCombobox
        value={String(notificationTemplateId ?? "")}
        onValueChange={(value) => onNotificationTemplateChange(value ? Number(value) : undefined)}
        disabled={!hasSubmitterEmail}
        options={[
          { value: "", label: notificationNoneLabel },
          ...emailTemplates.map((template) => ({
            value: String(template.id),
            label: template.name,
          })),
        ]}
      />
      {!hasSubmitterEmail && (
        <p className="text-xs text-[var(--ds-text-hint)] mt-1.5">{notificationHint}</p>
      )}
    </div>
  );
}
