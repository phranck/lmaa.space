import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { usePersistedTextareaHeight } from "@/lib/usePersistedTextareaHeight.ts";
import { CharCounter, Checkbox, MarkdownTextarea } from "@lmaa/ui";
import type { ClipboardEvent, ReactNode } from "react";
import { SFDocumentOnDocumentFill, SFXmarkCircleFill } from "sf-symbols-lib/monochrome";

export interface RejectDialogMessages {
  cancel: string;
  comment: string;
  optional: string;
  commentPlaceholder: string;
  rejectionLongLabel: string;
  rejectionLongPlaceholder: string;
  feedbackToPrefix: string;
  errorPrefix: string;
}

export interface RejectDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  name: string;
  url: string;
  adminNote: string;
  onAdminNoteChange: (v: string) => void;
  onAdminNotePaste?: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
  rejectionLongText: string;
  onRejectionLongTextChange: (v: string) => void;
  submitterEmail?: string;
  sendFeedback?: boolean;
  onSendFeedbackChange?: (v: boolean) => void;
  onSubmit: () => void;
  isPending: boolean;
  isError?: boolean;
  errorMessage?: string;
  submitLabel: string;
  submitVariant?: "danger" | "primary";
  submitIcon?: ReactNode;
  headerRight?: ReactNode;
  storageKey?: string;
  adminNoteStorageKey?: string;
  rejectionLongStorageKey?: string;
  messages: RejectDialogMessages;
}

export function RejectDialog({
  open,
  onClose,
  title,
  name,
  url,
  adminNote,
  onAdminNoteChange,
  onAdminNotePaste,
  rejectionLongText,
  onRejectionLongTextChange,
  submitterEmail,
  sendFeedback,
  onSendFeedbackChange,
  onSubmit,
  isPending,
  isError,
  errorMessage,
  submitLabel,
  submitVariant = "danger",
  submitIcon,
  headerRight,
  storageKey = "reject-dialog-size",
  adminNoteStorageKey,
  rejectionLongStorageKey,
  messages,
}: RejectDialogProps) {
  const isDanger = submitVariant === "danger";

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
          <h3 className="font-bold text-[var(--ds-text)]">{title}</h3>
          {headerRight}
        </div>
        <p className="text-sm text-[var(--ds-text-muted)] mt-0.5">{name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <p className="text-xs text-[var(--ds-text-subtle)] truncate">{url}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(url)}
            className="shrink-0 ml-auto p-1 rounded text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)] transition-colors"
            aria-label="Copy URL"
          >
            <SFDocumentOnDocumentFill className="w-4 h-4" />
          </button>
        </div>
      </OverlayCard.Header>

      <OverlayCard.Body className="flex flex-col gap-3">
        <div>
          <label
            htmlFor="reject-note"
            className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
          >
            {messages.comment}{" "}
            <span className="text-[var(--ds-text-subtle)] font-normal">{messages.optional}</span>
          </label>
          <MarkdownTextarea
            id="reject-note"
            value={adminNote}
            onChange={onAdminNoteChange}
            onPaste={onAdminNotePaste}
            rows={3}
            placeholder={messages.commentPlaceholder}
          />
          <CharCounter value={adminNote} max={1200} className="block mt-1 text-right" />
        </div>

        <div>
          <label
            htmlFor="reject-long"
            className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
          >
            {messages.rejectionLongLabel}{" "}
            <span className="text-[var(--ds-text-subtle)] font-normal">{messages.optional}</span>
          </label>
          <MarkdownTextarea
            id="reject-long"
            value={rejectionLongText}
            onChange={onRejectionLongTextChange}
            rows={6}
            placeholder={messages.rejectionLongPlaceholder}
          />
        </div>

        {submitterEmail && onSendFeedbackChange && (
          <Checkbox
            checked={sendFeedback ?? false}
            onChange={onSendFeedbackChange}
            label={
              <>
                {messages.feedbackToPrefix} <span className="font-medium">{submitterEmail}</span>
              </>
            }
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
          {submitIcon ?? <SFXmarkCircleFill className="w-3.5 h-3.5" />}
          {isPending ? "…" : submitLabel}
        </button>
      </OverlayCard.Footer>
    </OverlayCard>
  );
}
