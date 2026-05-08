import {
  CheckCircleIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  MastodonLogoIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { Suspense, lazy } from "react";

import type { Submission } from "@lmaa/shared";
import { CharCounter, FormLabel, FormOptional } from "@lmaa/ui";

const MarkdownEditor = lazy(() => import("@lmaa/ui").then((m) => ({ default: m.MarkdownEditor })));

import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { NotificationTemplateSelect, RejectDialog } from "@/components/ui/RejectDialog.tsx";
import { SaveNotification, type useSaveNotification } from "@/components/ui/SaveNotification.tsx";
import type { useShopEditorController } from "@/features/content/shops/hooks/useShopEditorController.ts";
import type {
  useDeleteSubmission,
  useReviewSubmission,
} from "@/features/overview/hooks/useSubmissions.ts";
import type { ReviewAction, ReviewState } from "@/features/overview/submission-review-state.ts";
import type { DashboardMessages } from "@/i18n/messages.ts";

interface SubmissionDialogsProps {
  submission: Submission;
  submitterEmail: string;
  reviewState: ReviewState;
  dispatchReview: React.Dispatch<ReviewAction>;
  reviewMutation: ReturnType<typeof useReviewSubmission>;
  deleteMutation: ReturnType<typeof useDeleteSubmission>;
  emailTemplates: Array<{ id: number; name: string }>;
  templates: Array<{ id: number; name: string }>;
  controller: ReturnType<typeof useShopEditorController>;
  combinedSavedPhase: ReturnType<typeof useSaveNotification>["phase"];
  showDeleteDialog: boolean;
  setShowDeleteDialog: (open: boolean) => void;
  handleApprove: (close?: boolean) => Promise<void>;
  handleReject: () => void;
  handleTemplateChange: (value: number | undefined) => void;
  navigateBack: () => void;
  common: DashboardMessages["common"];
  submissionsMessages: DashboardMessages["submissions"];
}

export function SubmissionDialogs({
  submission,
  submitterEmail,
  reviewState,
  dispatchReview,
  reviewMutation,
  deleteMutation,
  emailTemplates,
  templates,
  controller,
  combinedSavedPhase,
  showDeleteDialog,
  setShowDeleteDialog,
  handleApprove,
  handleReject,
  handleTemplateChange,
  navigateBack,
  common,
  submissionsMessages,
}: SubmissionDialogsProps) {
  return (
    <>
      <ApproveSubmissionReviewCard
        adminNote={reviewState.adminNote}
        cancelLabel={common.cancel}
        commentLabel={submissionsMessages.suggestions.comment}
        commentPlaceholder={submissionsMessages.suggestions.commentPlaceholder}
        copyUrlLabel={common.copyUrl}
        errorMessage={reviewMutation.error?.message ?? common.unknownError}
        formSaveErrorMessage={controller.saveErrorMessage}
        errorPrefix={submissionsMessages.suggestions.reviewErrorPrefix}
        isError={reviewMutation.isError}
        onAdminNoteChange={(value) => dispatchReview({ type: "setAdminNote", value })}
        onClose={() => dispatchReview({ type: "close" })}
        onSubmit={() => {
          void handleApprove();
        }}
        open={reviewState.reviewMode === "approve"}
        optionalLabel={submissionsMessages.suggestions.optional}
        reviewTitle={submissionsMessages.suggestions.reviewApproveTitle}
        reviewing={submission}
        savedLabel={common.saved}
        savedPhase={combinedSavedPhase}
        submitLabel={submissionsMessages.suggestions.accept}
        isPending={controller.isPending || reviewMutation.isPending}
        emailTemplates={emailTemplates}
        notificationTemplateId={reviewState.notificationTemplateId}
        onNotificationTemplateChange={(value) =>
          dispatchReview({ type: "setNotificationTemplateId", value })
        }
        notificationLabel={submissionsMessages.suggestions.notificationApproved}
        notificationNoneLabel={submissionsMessages.suggestions.notificationNone}
        notificationHint={submissionsMessages.suggestions.notificationHint}
        hasSubmitterEmail={!!submitterEmail}
        templates={templates}
        templateId={reviewState.templateId}
        onTemplateChange={handleTemplateChange}
        mastodonNotificationLabel={submissionsMessages.suggestions.mastodonNotificationLabel}
        mastodonNotificationNoneLabel={submissionsMessages.suggestions.mastodonNotificationNone}
        mastodonNotificationHint={submissionsMessages.suggestions.mastodonNotificationHint}
      />

      <RejectDialog
        open={reviewState.reviewMode === "reject"}
        onClose={() => dispatchReview({ type: "close" })}
        title={
          reviewState.editingRejection
            ? submissionsMessages.suggestions.reviewEditRejectionTitle
            : submissionsMessages.suggestions.reviewRejectTitle
        }
        headerIcon={
          reviewState.editingRejection ? (
            <FileTextIcon weight="duotone" className={dialogHeaderIconClass} />
          ) : (
            <XCircleIcon weight="duotone" className={dialogHeaderIconClass} />
          )
        }
        name={submission.shopName}
        url={submission.shopUrl}
        adminNote={reviewState.adminNote}
        onAdminNoteChange={(value) => dispatchReview({ type: "setAdminNote", value })}
        rejectionLongText={reviewState.rejectionLongText}
        onRejectionLongTextChange={(value) =>
          dispatchReview({ type: "setRejectionLongText", value })
        }
        rejectionToken={reviewState.rejectionToken}
        onSubmit={handleReject}
        isPending={reviewMutation.isPending}
        isError={reviewMutation.isError}
        errorMessage={reviewMutation.error?.message ?? common.unknownError}
        submitLabel={
          reviewState.editingRejection ? common.save : submissionsMessages.suggestions.decline
        }
        submitVariant={reviewState.editingRejection ? "primary" : "danger"}
        submitIcon={
          reviewState.editingRejection ? (
            <DownloadIcon weight="duotone" className="w-3.5 h-3.5" />
          ) : undefined
        }
        headerRight={<SaveNotification phase={combinedSavedPhase} label={common.saved} />}
        storageKey="submissions:review-reject-size"
        adminNoteStorageKey="submissions:textarea:admin-note"
        rejectionLongStorageKey="submissions:textarea:rejection-long"
        messages={{
          cancel: common.cancel,
          comment: submissionsMessages.suggestions.comment,
          copyUrl: common.copyUrl,
          optional: submissionsMessages.suggestions.optional,
          commentPlaceholder: submissionsMessages.suggestions.rejectReasonPlaceholder,
          rejectionLongLabel: submissionsMessages.suggestions.rejectionLongLabel,
          rejectionLongPlaceholder: submissionsMessages.suggestions.rejectionLongPlaceholder,
          errorPrefix: submissionsMessages.suggestions.reviewErrorPrefix,
        }}
        notification={{
          emailTemplates,
          notificationTemplateId: reviewState.notificationTemplateId,
          onNotificationTemplateChange: (value) =>
            dispatchReview({ type: "setNotificationTemplateId", value }),
          notificationLabel: submissionsMessages.suggestions.notificationRejected,
          notificationNoneLabel: submissionsMessages.suggestions.notificationNone,
          notificationHint: submissionsMessages.suggestions.notificationHint,
          hasSubmitterEmail: !!submitterEmail,
        }}
      />

      <DeleteSubmissionDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        shopName={submission.shopName}
        isPending={deleteMutation.isPending}
        onDelete={() =>
          deleteMutation.mutate(submission.id, {
            onSuccess: navigateBack,
          })
        }
        messages={submissionsMessages.suggestions}
        common={common}
      />
    </>
  );
}

interface DeleteSubmissionDialogProps {
  open: boolean;
  onClose: () => void;
  shopName: string;
  isPending: boolean;
  onDelete: () => void;
  messages: { confirmDeleteTitle: string; confirmDeleteDescription: string };
  common: { cancel: string; delete: string };
}

function DeleteSubmissionDialog({
  open,
  onClose,
  shopName,
  isPending,
  onDelete,
  messages: submissionsMessages,
  common,
}: DeleteSubmissionDialogProps) {
  if (!open) return null;

  return (
    <OverlayCard
      open={open}
      onClose={onClose}
      size={{ storageKey: "submissions:delete-size", defaultWidth: 480 }}
      aria-label={submissionsMessages.confirmDeleteTitle}
    >
      <OverlayCard.Header>
        <div className="flex items-center gap-3">
          <TrashIcon weight="duotone" className={dialogHeaderIconClass} />
          <h3 className="font-bold text-[var(--ds-text)]">
            {submissionsMessages.confirmDeleteTitle}
          </h3>
        </div>
      </OverlayCard.Header>

      <OverlayCard.Body>
        <p className="text-sm text-[var(--ds-text-muted)]">
          <span className="font-medium">{shopName}</span>{" "}
          {submissionsMessages.confirmDeleteDescription}
        </p>
      </OverlayCard.Body>

      <OverlayCard.Footer className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)]"
        >
          {common.cancel}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onDelete}
          className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-danger-border)] rounded-control text-sm font-medium text-[var(--ds-btn-danger-text)] hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] disabled:opacity-60"
        >
          <TrashIcon weight="duotone" className="w-3.5 h-3.5" />
          {isPending ? "..." : common.delete}
        </button>
      </OverlayCard.Footer>
    </OverlayCard>
  );
}

interface ApproveSubmissionReviewCardProps {
  adminNote: string;
  cancelLabel: string;
  commentLabel: string;
  commentPlaceholder: string;
  copyUrlLabel: string;
  errorMessage: string;
  formSaveErrorMessage: string | null;
  errorPrefix: string;
  isError: boolean;
  isPending: boolean;
  onAdminNoteChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  open: boolean;
  optionalLabel: string;
  reviewTitle: string;
  reviewing: Submission;
  savedLabel: string;
  savedPhase: ReturnType<typeof useSaveNotification>["phase"];
  submitLabel: string;
  emailTemplates: Array<{ id: number; name: string }>;
  notificationTemplateId: number | undefined;
  onNotificationTemplateChange: (value: number | undefined) => void;
  notificationLabel: string;
  notificationNoneLabel: string;
  notificationHint: string;
  hasSubmitterEmail: boolean;
  templates: Array<{ id: number; name: string }>;
  templateId: number | undefined;
  onTemplateChange: (value: number | undefined) => void;
  mastodonNotificationLabel: string;
  mastodonNotificationNoneLabel: string;
  mastodonNotificationHint: string;
}

function ApproveSubmissionReviewCard({
  adminNote,
  cancelLabel,
  commentLabel,
  commentPlaceholder,
  copyUrlLabel,
  errorMessage,
  formSaveErrorMessage,
  errorPrefix,
  isError,
  isPending,
  onAdminNoteChange,
  onClose,
  onSubmit,
  open,
  optionalLabel,
  reviewTitle,
  reviewing,
  savedLabel,
  savedPhase,
  submitLabel,
  emailTemplates,
  notificationTemplateId,
  onNotificationTemplateChange,
  notificationLabel,
  notificationNoneLabel,
  notificationHint,
  hasSubmitterEmail,
  templates,
  templateId,
  onTemplateChange,
  mastodonNotificationLabel,
  mastodonNotificationNoneLabel,
  mastodonNotificationHint,
}: ApproveSubmissionReviewCardProps) {
  return (
    <OverlayCard
      open={open}
      onClose={onClose}
      size={{ storageKey: "submissions:review-approve-size", defaultWidth: 448 }}
      aria-label={reviewTitle}
    >
      <OverlayCard.Header>
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <CheckCircleIcon weight="duotone" className={dialogHeaderIconClass} />
            <h3 className="font-bold text-[var(--ds-text)]">{reviewTitle}</h3>
          </div>
          <SaveNotification phase={savedPhase} label={savedLabel} />
        </div>
        <p className="text-sm text-[var(--ds-text-muted)] mt-0.5">{reviewing.shopName}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <p className="text-xs text-[var(--ds-text-subtle)] truncate">{reviewing.shopUrl}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(reviewing.shopUrl)}
            className="shrink-0 ml-auto p-1 rounded text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)]"
            aria-label={copyUrlLabel}
          >
            <CopyIcon weight="duotone" className="w-4 h-4" />
          </button>
        </div>
      </OverlayCard.Header>

      <OverlayCard.Body className="flex flex-col gap-3">
        <div>
          <FormLabel htmlFor="submission-editor-admin-note">
            {commentLabel} <FormOptional>{optionalLabel}</FormOptional>
          </FormLabel>
          <Suspense
            fallback={
              <div className="h-[4.5rem] rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] animate-pulse" />
            }
          >
            <MarkdownEditor
              id="submission-editor-admin-note"
              value={adminNote}
              onChange={onAdminNoteChange}
              rows={3}
              resizable
              placeholder={commentPlaceholder}
            />
          </Suspense>
          <CharCounter value={adminNote} max={1200} className="block mt-1 text-right" />
        </div>

        <NotificationTemplateSelect
          emailTemplates={emailTemplates}
          notificationTemplateId={notificationTemplateId}
          onNotificationTemplateChange={onNotificationTemplateChange}
          notificationLabel={notificationLabel}
          notificationNoneLabel={notificationNoneLabel}
          notificationHint={notificationHint}
          hasSubmitterEmail={hasSubmitterEmail}
        />

        <SocialMediaTemplateSelect
          templates={templates}
          templateId={templateId}
          onTemplateChange={onTemplateChange}
          label={mastodonNotificationLabel}
          noneLabel={mastodonNotificationNoneLabel}
          hint={mastodonNotificationHint}
        />

        {(isError || formSaveErrorMessage) && (
          <p className="text-sm text-red-600">
            {errorPrefix} {formSaveErrorMessage ?? errorMessage}
          </p>
        )}
      </OverlayCard.Body>

      <OverlayCard.Footer className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)]"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onSubmit}
          className="flex items-center gap-2 h-9 px-4 border rounded-control text-sm font-medium disabled:opacity-60 border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)]"
        >
          {isPending ? (
            "…"
          ) : (
            <>
              <CheckCircleIcon weight="duotone" className="w-3.5 h-3.5" />
              {submitLabel}
            </>
          )}
        </button>
      </OverlayCard.Footer>
    </OverlayCard>
  );
}

interface SocialMediaTemplateSelectProps {
  templates: Array<{ id: number; name: string }>;
  templateId: number | undefined;
  onTemplateChange: (value: number | undefined) => void;
  label: string;
  noneLabel: string;
  hint: string;
}

function SocialMediaTemplateSelect({
  templates,
  templateId,
  onTemplateChange,
  label,
  noneLabel,
  hint,
}: SocialMediaTemplateSelectProps) {
  return (
    <div className="rounded-lg border border-[var(--ds-border)] p-3">
      <div className="mb-2 flex items-center gap-2">
        <MastodonLogoIcon weight="duotone" className="h-4 w-4 text-[var(--ds-text-muted)]" />
        <span className="text-sm font-medium text-[var(--ds-text)]">{label}</span>
      </div>
      <select
        value={templateId ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          onTemplateChange(value ? Number(value) : undefined);
        }}
        className="h-9 w-full rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] px-3 text-sm text-[var(--ds-text)]"
      >
        <option value="">{noneLabel}</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-[var(--ds-text-subtle)]">{hint}</p>
    </div>
  );
}
