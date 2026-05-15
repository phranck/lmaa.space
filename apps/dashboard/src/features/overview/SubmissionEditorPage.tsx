import { useReducer, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";

import { type Submission, generateRejectionToken } from "@lmaa/shared";

import { EditorPageShell } from "@/components/ui/EditorPageShell.tsx";
import { SaveNotification, useSaveNotification } from "@/components/ui/SaveNotification.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useShopEditorController } from "@/features/content/shops/hooks/useShopEditorController.ts";
import { ShopEditorFormContent } from "@/features/content/shops/ShopEditorFormContent.tsx";
import {
  useAdminSubmission,
  useDeleteSubmission,
  useReviewSubmission,
} from "@/features/overview/hooks/useSubmissions.ts";
import { EMPTY_REVIEW_STATE, reviewReducer } from "@/features/overview/submission-review-state.ts";
import { SubmissionDialogs } from "@/features/overview/SubmissionDialogs.tsx";
import { SubmissionToolbar } from "@/features/overview/SubmissionToolbar.tsx";
import { useEmailTemplates } from "@/features/templates/hooks/useEmailTemplates.ts";
import { useSocialMediaPostTemplates } from "@/features/templates/hooks/useSocialMediaPostTemplates.ts";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave.ts";
import { usePersistedTextareaHeight } from "@/lib/hooks/usePersistedTextareaHeight.ts";

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
    shopCheckNotes: submission.shopCheckNotes ?? null,
    logoBackgroundColor: submission.logoBackgroundColor ?? null,
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
  const templatesQuery = useSocialMediaPostTemplates();
  const templates = templatesQuery.data ?? [];

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
        templateAssignments: reviewState.templateAssignments,
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
            <p className="truncate text-lg font-semibold leading-tight text-[var(--ds-text)]">
              {pageTitle}
            </p>
            <p className="truncate text-[13px] leading-tight text-[var(--ds-text-muted)]">
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
            keyboardShortcut={reviewState.reviewMode === null}
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

      <SubmissionDialogs
        submission={submission}
        submitterEmail={submitterEmail}
        reviewState={reviewState}
        dispatchReview={dispatchReview}
        reviewMutation={reviewMutation}
        deleteMutation={deleteMutation}
        emailTemplates={emailTemplates}
        templates={templates}
        controller={controller}
        combinedSavedPhase={combinedSavedPhase}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        handleApprove={handleApprove}
        handleReject={handleReject}
        navigateBack={navigateBack}
        common={common}
        submissionsMessages={submissionsMessages}
      />
    </>
  );
}
