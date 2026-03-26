import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  InfoIcon,
  PauseCircleIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useReducer, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";

import { type Submission, generateRejectionToken } from "@lmaa/shared";
import { CharCounter, FormLabel, FormOptional, MarkdownEditor } from "@lmaa/ui";

import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { EditorPageShell } from "@/components/ui/EditorPageShell.tsx";
import { EditorToolbarButton } from "@/components/ui/EditorToolbarButton.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { NotificationTemplateSelect, RejectDialog } from "@/components/ui/RejectDialog.tsx";
import { SaveNotification, useSaveNotification } from "@/components/ui/SaveNotification.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { ShopEditorFormContent } from "@/features/content/shops/ShopEditorFormContent.tsx";
import { useShopEditorController } from "@/features/content/shops/useShopEditorController.ts";
import {
  useAdminSubmission,
  useDeleteSubmission,
  useReviewSubmission,
} from "@/features/overview/hooks/useSubmissions.ts";
import { useEmailTemplates } from "@/features/templates/hooks/useEmailTemplates.ts";
import type { DashboardMessages } from "@/i18n/messages.ts";
import { useKeyboardSave } from "@/lib/useKeyboardSave.ts";
import { usePersistedTextareaHeight } from "@/lib/usePersistedTextareaHeight.ts";

function resolveSubmissionRoute(submissionIdParam: string | undefined) {
  const parsed = Number(submissionIdParam);
  if (!submissionIdParam || Number.isNaN(parsed) || parsed <= 0) {
    return { submissionId: null, invalid: true };
  }

  return { submissionId: parsed, invalid: false };
}

function toSubmissionFormData(submission: Submission) {
  return {
    name: submission.shopName,
    url: submission.shopUrl,
    description: submission.description ?? "",
    categoryIds: submission.categoryIds ?? [],
    region: Array.isArray(submission.region) ? submission.region : [],
    shipping: submission.shipping ?? "",
    contactEmail: submission.contactEmail ?? "",
    socialMedia: submission.socialMedia ?? {},
    headquartersStreet: submission.headquarters?.street ?? "",
    headquartersPostalCode: submission.headquarters?.postalCode ?? "",
    headquartersCity: submission.headquarters?.city ?? "",
    headquartersState: submission.headquarters?.state ?? "",
    headquartersCountryCode: submission.headquarters?.countryCode ?? "",
    headquartersLatitude:
      submission.headquarters?.latitude !== null && submission.headquarters?.latitude !== undefined
        ? String(submission.headquarters.latitude)
        : "",
    headquartersLongitude:
      submission.headquarters?.longitude !== null &&
      submission.headquarters?.longitude !== undefined
        ? String(submission.headquarters.longitude)
        : "",
  };
}

type ReviewState = {
  adminNote: string;
  editingRejection: boolean;
  rejectionLongText: string;
  rejectionToken: string | null;
  reviewMode: "approve" | "reject" | null;
  notificationTemplateId: number | undefined;
};

type ReviewAction =
  | { type: "close" }
  | { type: "openApprove"; adminNote: string }
  | {
      type: "openReject";
      adminNote: string;
      editingRejection: boolean;
      rejectionLongText: string;
      rejectionToken: string | null;
    }
  | { type: "setAdminNote"; value: string }
  | { type: "setRejectionLongText"; value: string }
  | { type: "setNotificationTemplateId"; value: number | undefined };

const STORAGE_KEY_APPROVED = "submissions:notification-template:approved";
const STORAGE_KEY_REJECTED = "submissions:notification-template:rejected";

function loadPersistedTemplateId(key: string): number | undefined {
  const raw = localStorage.getItem(key);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function persistTemplateId(key: string, value: number | undefined) {
  if (value) {
    localStorage.setItem(key, String(value));
  } else {
    localStorage.removeItem(key);
  }
}

const EMPTY_REVIEW_STATE: ReviewState = {
  adminNote: "",
  editingRejection: false,
  rejectionLongText: "",
  rejectionToken: null,
  reviewMode: null,
  notificationTemplateId: undefined,
};

function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case "close":
      return EMPTY_REVIEW_STATE;
    case "openApprove":
      return {
        ...EMPTY_REVIEW_STATE,
        reviewMode: "approve",
        adminNote: action.adminNote,
        notificationTemplateId: loadPersistedTemplateId(STORAGE_KEY_APPROVED),
      };
    case "openReject":
      return {
        adminNote: action.adminNote,
        editingRejection: action.editingRejection,
        rejectionLongText: action.rejectionLongText,
        rejectionToken: action.rejectionToken,
        reviewMode: "reject",
        notificationTemplateId: loadPersistedTemplateId(STORAGE_KEY_REJECTED),
      };
    case "setAdminNote":
      return { ...state, adminNote: action.value };
    case "setRejectionLongText":
      return { ...state, rejectionLongText: action.value };
    case "setNotificationTemplateId": {
      const storageKey = state.reviewMode === "approve" ? STORAGE_KEY_APPROVED : STORAGE_KEY_REJECTED;
      persistTemplateId(storageKey, action.value);
      return { ...state, notificationTemplateId: action.value };
    }
  }
}

export function SubmissionEditorPage() {
  const { submissionId: submissionIdParam } = useParams();
  const { submissionId, invalid } = resolveSubmissionRoute(submissionIdParam);

  if (invalid || submissionId === null) {
    return <Navigate to="/reports/suggestions" replace />;
  }

  return <ResolvedSubmissionEditorPage submissionId={submissionId} />;
}

function ResolvedSubmissionEditorPage({ submissionId }: { submissionId: number }) {
  const { messages } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const submissionsMessages = messages.submissions;
  const submissionQuery = useAdminSubmission(submissionId);
  const submission = submissionQuery.data ?? null;
  const returnTo =
    typeof location.state === "object" &&
    location.state !== null &&
    "returnTo" in location.state &&
    typeof location.state.returnTo === "string"
      ? location.state.returnTo
      : "/reports/suggestions";

  if (submissionQuery.isLoading) {
    return (
      <EditorPageShell
        title={submissionsMessages.suggestions.edit}
        backLabel={submissionsMessages.title}
        onBack={() => navigate(returnTo)}
        headerContent={<div className="flex items-center gap-3"></div>}
        cardClassName="animate-pulse"
      >
        <div />
      </EditorPageShell>
    );
  }

  if (!submission || submission.status === "approved") {
    return <Navigate to="/reports/suggestions" replace />;
  }

  return (
    <LoadedSubmissionEditorPage
      submission={submission}
      isFetching={submissionQuery.isFetching}
      returnTo={returnTo}
    />
  );
}

function LoadedSubmissionEditorPage({
  submission,
  isFetching,
  returnTo,
}: {
  submission: Submission;
  isFetching: boolean;
  returnTo: string;
}) {
  const { locale, messages } = useI18n();
  const navigate = useNavigate();
  const [reviewState, dispatchReview] = useReducer(reviewReducer, EMPTY_REVIEW_STATE);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { phase: reviewSavedPhase, show: showReviewSaved } = useSaveNotification();
  const common = messages.common;
  const submissionsMessages = messages.submissions;
  const reviewMutation = useReviewSubmission();
  const deleteMutation = useDeleteSubmission();
  const emailTemplatesQuery = useEmailTemplates();
  const emailTemplates = emailTemplatesQuery.data ?? [];

  const controller = useShopEditorController({
    submissionId: submission.id,
    initialData: toSubmissionFormData(submission),
    initialOgImage: submission.ogImage,
  });

  usePersistedTextareaHeight(
    "submission-editor-admin-note",
    "submissions:textarea:admin-note",
    reviewState.reviewMode === "approve",
  );

  useKeyboardSave(() => {
    if (reviewState.reviewMode === "approve" && !reviewMutation.isPending) {
      handleApprove(false);
    }
  }, reviewState.reviewMode === "approve");

  const headerBackLabel = submissionsMessages.title;
  const pageTitle = submission.shopName || submissionsMessages.suggestions.edit;
  const submittedAt = new Date(submission.createdAt).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const submitterEmail = submission.submitterEmail?.trim() ?? "";
  const pageSubtitle = submitterEmail
    ? `${submissionsMessages.suggestions.submittedBy}: ${submitterEmail} · ${submissionsMessages.suggestions.submittedAt}: ${submittedAt}`
    : `${submissionsMessages.suggestions.submittedAt}: ${submittedAt}`;
  const saveLabel = common.save;
  const combinedSavedPhase =
    controller.savedPhase !== "hidden" ? controller.savedPhase : reviewSavedPhase;
  const isActionPending =
    controller.isPending || reviewMutation.isPending || deleteMutation.isPending || isFetching;

  function navigateBack() {
    navigate(returnTo);
  }

  function openApproveReview() {
    dispatchReview({
      type: "openApprove",
      adminNote: submission.adminNote ?? "",
    });
  }

  function openRejectReview(editingRejection: boolean) {
    dispatchReview({
      type: "openReject",
      adminNote: editingRejection ? (submission.adminNote ?? "") : "",
      editingRejection,
      rejectionLongText: editingRejection ? (submission.rejectionLongText ?? "") : "",
      rejectionToken: editingRejection
        ? (submission.rejectionToken ?? null)
        : generateRejectionToken(),
    });
  }

  async function handleApprove(close = true) {
    try {
      await controller.handleSave({
        onSuccess: async () => {},
      });

      await reviewMutation.mutateAsync({
        id: submission.id,
        status: "approved",
        adminNote: reviewState.adminNote,
        notificationTemplateId: reviewState.notificationTemplateId,
      });

      if (close) {
        navigateBack();
      } else {
        showReviewSaved();
      }
      dispatchReview({ type: "close" });
    } catch {
      // Save/review errors are surfaced via the existing form and mutation state.
    }
  }

  function handleSetStatus(
    status: "pending" | "onhold",
    options?: { navigateBack?: boolean; onSuccess?: () => void },
  ) {
    reviewMutation.mutate(
      {
        id: submission.id,
        status,
        adminNote: "",
      },
      {
        onSuccess: () => {
          options?.onSuccess?.();
          if (options?.navigateBack) {
            navigateBack();
          }
        },
      },
    );
  }

  function handleReject() {
    reviewMutation.mutate(
      {
        id: submission.id,
        status: "rejected",
        adminNote: reviewState.adminNote,
        rejectionLongText: reviewState.rejectionLongText || undefined,
        rejectionToken: reviewState.rejectionToken ?? undefined,
        notificationTemplateId: reviewState.notificationTemplateId,
      },
      {
        onSuccess: () => {
          dispatchReview({ type: "close" });
          if (reviewState.editingRejection) {
            showReviewSaved();
          } else {
            navigateBack();
          }
        },
      },
    );
  }

  return (
    <>
      <EditorPageShell
        title={pageTitle}
        titleContent={
          <div className="pointer-events-none min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold leading-4 text-[var(--ds-text)]">
              {pageTitle}
            </p>
            <p className="truncate text-[11px] leading-4 text-[var(--ds-text-muted)]">
              {pageSubtitle}
            </p>
          </div>
        }
        backLabel={headerBackLabel}
        onBack={navigateBack}
        headerContent={
          <div className="flex items-center gap-3">
            <SaveNotification phase={combinedSavedPhase} label={common.saved} />
          </div>
        }
        toolbar={
          <SubmissionToolbar
            submission={submission}
            isActionPending={isActionPending}
            canSave={controller.canSave}
            saveLabel={saveLabel}
            messages={submissionsMessages}
            onApprove={openApproveReview}
            onReject={openRejectReview}
            onSetStatus={handleSetStatus}
            onDelete={() => setShowDeleteDialog(true)}
            onSave={() =>
              void controller.handleSaveSafely({
                onSuccess: () => {
                  controller.showSaved();
                },
              })
            }
          />
        }
      >
        <ShopEditorFormContent controller={controller} />
      </EditorPageShell>

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

interface SubmissionToolbarProps {
  submission: Submission;
  isActionPending: boolean;
  canSave: boolean;
  saveLabel: string;
  messages: DashboardMessages["submissions"];
  onApprove: () => void;
  onReject: (editingRejection: boolean) => void;
  onSetStatus: (status: "pending" | "onhold", options?: { navigateBack?: boolean }) => void;
  onDelete: () => void;
  onSave: () => void;
}

function SubmissionToolbar({
  submission,
  isActionPending,
  canSave,
  saveLabel,
  messages: submissionsMessages,
  onApprove,
  onReject,
  onSetStatus,
  onDelete,
  onSave,
}: SubmissionToolbarProps) {
  const isRejected = submission.status === "rejected";
  const isPending = submission.status === "pending";
  const isOnHold = submission.status === "onhold";
  const showDelete = submission.status === "onhold" || submission.status === "rejected";

  return (
    <div className="flex items-center gap-2">
      {isPending && (
        <>
          <EditorToolbarButton
            onClick={onApprove}
            disabled={isActionPending}
            variant="success"
            icon={<CheckCircleIcon weight="duotone" className="h-3.5 w-3.5" />}
          >
            {submissionsMessages.suggestions.approve}
          </EditorToolbarButton>
          <EditorToolbarButton
            onClick={() => onSetStatus("onhold")}
            disabled={isActionPending}
            variant="warning"
            icon={<PauseCircleIcon weight="duotone" className="h-3.5 w-3.5" />}
          >
            {submissionsMessages.suggestions.onhold}
          </EditorToolbarButton>
          <EditorToolbarButton
            onClick={() => onReject(false)}
            disabled={isActionPending}
            variant="danger"
            icon={<XCircleIcon weight="duotone" className="h-3.5 w-3.5" />}
          >
            {submissionsMessages.suggestions.reject}
          </EditorToolbarButton>
        </>
      )}

      {isOnHold && (
        <>
          <EditorToolbarButton
            onClick={() => onSetStatus("pending")}
            disabled={isActionPending}
            variant="success"
            icon={<ArrowCounterClockwiseIcon weight="duotone" className="h-3.5 w-3.5" />}
          >
            {submissionsMessages.suggestions.restore}
          </EditorToolbarButton>
          <EditorToolbarButton
            onClick={() => onReject(false)}
            disabled={isActionPending}
            variant="danger"
            icon={<XCircleIcon weight="duotone" className="h-3.5 w-3.5" />}
          >
            {submissionsMessages.suggestions.reject}
          </EditorToolbarButton>
        </>
      )}

      {isRejected && (
        <>
          <EditorToolbarButton
            onClick={onApprove}
            disabled={isActionPending}
            variant="success"
            icon={<CheckCircleIcon weight="duotone" className="h-3.5 w-3.5" />}
          >
            {submissionsMessages.suggestions.approve}
          </EditorToolbarButton>

          <EditorToolbarButton
            onClick={() => onReject(true)}
            disabled={isActionPending}
            variant="neutral"
            icon={<FileTextIcon weight="duotone" className="h-3.5 w-3.5" />}
          >
            {submissionsMessages.suggestions.editRejectionInfo}
          </EditorToolbarButton>

          {submission.rejectionToken ? (
            <EditorToolbarButton
              onClick={() =>
                window.open(
                  `${import.meta.env.VITE_FRONTEND_URL ?? (import.meta.env.DEV ? "http://localhost:4321" : "https://lmaa.space")}/rejected/${submission.rejectionToken}`,
                  "_blank",
                )
              }
              disabled={isActionPending}
              variant="warning"
              icon={<InfoIcon weight="duotone" className="h-3.5 w-3.5" />}
            >
              {submissionsMessages.suggestions.info}
            </EditorToolbarButton>
          ) : (
            <EditorToolbarButton
              onClick={() => onSetStatus("pending")}
              disabled={isActionPending}
              variant="success"
              icon={<ArrowCounterClockwiseIcon weight="duotone" className="h-3.5 w-3.5" />}
            >
              {submissionsMessages.suggestions.setToOpen}
            </EditorToolbarButton>
          )}
        </>
      )}

      {showDelete && (
        <EditorToolbarButton
          onClick={onDelete}
          disabled={isActionPending}
          variant="danger"
          icon={<TrashIcon weight="duotone" className="h-3.5 w-3.5" />}
        >
          {submissionsMessages.suggestions.delete}
        </EditorToolbarButton>
      )}

      <EditorToolbarButton
        onClick={onSave}
        disabled={!canSave || isActionPending}
        variant="primary"
        icon={<DownloadIcon weight="duotone" className="h-3.5 w-3.5" />}
      >
        {saveLabel}
      </EditorToolbarButton>
    </div>
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
          className="h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors"
        >
          {common.cancel}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onDelete}
          className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-danger-border)] rounded-control text-sm font-medium text-[var(--ds-btn-danger-text)] hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] disabled:opacity-60 transition-colors"
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
            className="shrink-0 ml-auto p-1 rounded text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)] transition-colors"
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
          <MarkdownEditor
            id="submission-editor-admin-note"
            value={adminNote}
            onChange={onAdminNoteChange}
            rows={3}
            resizable
            placeholder={commentPlaceholder}
          />
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
          className="h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onSubmit}
          className="flex items-center gap-2 h-9 px-4 border rounded-control text-sm font-medium transition-colors disabled:opacity-60 border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)]"
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
