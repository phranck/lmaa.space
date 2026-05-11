import {
  CheckCircleIcon,
  DownloadIcon,
  FileTextIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { Suspense, lazy, useState } from "react";

import type { SocialMediaPostTemplate, TemplateAssignment } from "@lmaa/contracts";
import type { Submission } from "@lmaa/shared";
import { CharCounter } from "@lmaa/ui/char-counter";
import { FormLabel, FormOptional } from "@lmaa/ui/form-primitives";

const MarkdownEditor = lazy(() =>
  import("@lmaa/ui/markdown-editor").then((m) => ({ default: m.MarkdownEditor })),
);

import {
  ApproveActionButton,
  CancelActionButton,
  CopyActionButton,
  DeleteActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { NotificationTemplateSelect, RejectDialog } from "@/components/ui/RejectDialog.tsx";
import { SaveNotification, type useSaveNotification } from "@/components/ui/SaveNotification.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAdminCategories } from "@/features/content/hooks/useAdminCategories.ts";
import type { useShopEditorController } from "@/features/content/shops/hooks/useShopEditorController.ts";
import type {
  useDeleteSubmission,
  useReviewSubmission,
} from "@/features/overview/hooks/useSubmissions.ts";
import { renderPostPreview } from "@/features/overview/post-preview.ts";
import type { ReviewAction, ReviewState } from "@/features/overview/submission-review-state.ts";
import { TemplateAssignmentsSection } from "@/features/social/components/TemplateAssignmentsSection.tsx";
import type { DashboardMessages } from "@/i18n/messages.ts";

interface SubmissionDialogsProps {
  submission: Submission;
  submitterEmail: string;
  reviewState: ReviewState;
  dispatchReview: React.Dispatch<ReviewAction>;
  reviewMutation: ReturnType<typeof useReviewSubmission>;
  deleteMutation: ReturnType<typeof useDeleteSubmission>;
  emailTemplates: Array<{ id: number; name: string }>;
  templates: SocialMediaPostTemplate[];
  controller: ReturnType<typeof useShopEditorController>;
  combinedSavedPhase: ReturnType<typeof useSaveNotification>["phase"];
  showDeleteDialog: boolean;
  setShowDeleteDialog: (open: boolean) => void;
  handleApprove: (close?: boolean) => Promise<void>;
  handleReject: () => void;
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
        templateAssignments={reviewState.templateAssignments}
        onTemplateAssignmentsChange={(value) =>
          dispatchReview({ type: "setTemplateAssignments", value })
        }
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
            <DownloadIcon weight="duotone" className="size-3.5" />
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
          <h3 className="font-semibold text-[var(--ds-text)]">
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
        <CancelActionButton label={common.cancel} onClick={onClose} />
        <DeleteActionButton
          disabled={isPending}
          label={isPending ? "..." : common.delete}
          busy={isPending}
          onClick={onDelete}
        />
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
  templates: SocialMediaPostTemplate[];
  templateAssignments: TemplateAssignment[];
  onTemplateAssignmentsChange: (value: TemplateAssignment[]) => void;
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
  templateAssignments,
  onTemplateAssignmentsChange,
}: ApproveSubmissionReviewCardProps) {
  const { messages } = useI18n();
  const a = messages.socialMedia.approve;
  const [hasPostOverflow, setHasPostOverflow] = useState(false);
  const categoriesQuery = useAdminCategories();
  const categories = categoriesQuery.data ?? [];
  return (
    <OverlayCard
      open={open}
      onClose={onClose}
      size={{ storageKey: "submissions:review-approve-size", defaultWidth: 480 }}
      aria-label={reviewTitle}
    >
      <OverlayCard.Header>
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <CheckCircleIcon weight="duotone" className={dialogHeaderIconClass} />
            <h3 className="font-semibold text-[var(--ds-text)]">{reviewTitle}</h3>
          </div>
          <SaveNotification phase={savedPhase} label={savedLabel} />
        </div>
        <p className="text-sm text-[var(--ds-text-muted)] mt-0.5">{reviewing.shopName}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <p className="text-xs text-[var(--ds-text-subtle)] truncate">{reviewing.shopUrl}</p>
          <CopyActionButton
            iconOnly
            onClick={() => navigator.clipboard.writeText(reviewing.shopUrl)}
            className="shrink-0 ml-auto"
            label={copyUrlLabel}
            variant="ghost"
          />
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

        <TemplateAssignmentsSection
          templates={templates}
          scope="submission"
          assignments={templateAssignments}
          onChange={onTemplateAssignmentsChange}
          open={open}
          previewBody={(template, platform) => {
            const body = platform === "mastodon" ? template.bodyMastodon : template.bodyBluesky;
            if (!body) return "";
            return renderPostPreview(body, { submission: reviewing, adminNote, categories });
          }}
          onOverflowChange={setHasPostOverflow}
        />

        {(isError || formSaveErrorMessage) && (
          <p className="text-sm text-red-600">
            {errorPrefix} {formSaveErrorMessage ?? errorMessage}
          </p>
        )}
      </OverlayCard.Body>

      <OverlayCard.Footer className="flex items-center justify-end gap-3">
        {hasPostOverflow && (
          <span className="mr-auto text-xs text-red-500">{a.approveBlockedHint}</span>
        )}
        <CancelActionButton label={cancelLabel} onClick={onClose} />
        <ApproveActionButton
          disabled={isPending || hasPostOverflow}
          label={isPending ? "..." : submitLabel}
          busy={isPending}
          onClick={onSubmit}
        />
      </OverlayCard.Footer>
    </OverlayCard>
  );
}
