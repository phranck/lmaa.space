import { type ClipboardEvent, useMemo, useReducer, useState } from "react";
import SFArrowCounterclockwise from "sf-symbols-lib/monochrome/SFArrowCounterclockwise";
import SFArrowDownCircleFill from "sf-symbols-lib/monochrome/SFArrowDownCircleFill";
import SFArrowUpCircleFill from "sf-symbols-lib/monochrome/SFArrowUpCircleFill";
import SFCheckmarkCircleFill from "sf-symbols-lib/monochrome/SFCheckmarkCircleFill";
import SFClockFill from "sf-symbols-lib/monochrome/SFClockFill";
import SFDocumentOnDocumentFill from "sf-symbols-lib/monochrome/SFDocumentOnDocumentFill";
import SFInfoCircleFill from "sf-symbols-lib/monochrome/SFInfoCircleFill";
import SFLongTextPageAndPencilFill from "sf-symbols-lib/monochrome/SFLongTextPageAndPencilFill";
import SFPauseCircleFill from "sf-symbols-lib/monochrome/SFPauseCircleFill";
import SFSquareAndArrowDownFill from "sf-symbols-lib/monochrome/SFSquareAndArrowDownFill";
import SFTrashFill from "sf-symbols-lib/monochrome/SFTrashFill";
import SFTrayFill from "sf-symbols-lib/monochrome/SFTrayFill";
import SFXmarkCircleFill from "sf-symbols-lib/monochrome/SFXmarkCircleFill";

import { type Submission, type SubmissionStatus, generateRejectionToken } from "@lmaa/shared";
import { CharCounter } from "@lmaa/ui";

import { ItemCard } from "@/components/ui/Card.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  Dialog,
  dialogBtnDestructive,
  dialogBtnSecondary,
  dialogHeaderIconClass,
} from "@/components/ui/Dialog.tsx";
import { MarkdownTextarea } from "@/components/ui/MarkdownTextarea.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { RejectDialog } from "@/components/ui/RejectDialog.tsx";
import { SaveNotification, useSaveNotification } from "@/components/ui/SaveNotification.tsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { ShopCategoryBadges } from "@/components/ui/ShopCategoryBadges.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useAdminCategories } from "@/features/content/hooks/useAdminCategories.ts";
import { ShopEditCard } from "@/features/content/shops/ShopEditCard.tsx";
import {
  useAdminSubmissions,
  useDeleteSubmission,
  useReviewSubmission,
} from "@/features/overview/hooks/useSubmissions.ts";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";
import { useKeyboardSave } from "@/lib/useKeyboardSave.ts";
import { usePersistedTextareaHeight } from "@/lib/usePersistedTextareaHeight.ts";

// ---- Constants ----

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  pending: "bg-[var(--ds-badge-pending-bg)] text-[var(--ds-badge-pending-text)]",
  onhold: "bg-[var(--ds-bg-elevated)] text-[var(--ds-text-muted)]",
  approved: "bg-[var(--ds-badge-success-bg)] text-[var(--ds-badge-success-text)]",
  rejected: "bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)]",
};

function useStatusLabels() {
  const { messages } = useI18n();
  const status = messages.submissions.status;
  return {
    pending: status.pending,
    onhold: status.onhold,
    approved: status.approved,
    rejected: status.rejected,
  } satisfies Record<SubmissionStatus, string>;
}

// ---- Shop image (favicon + lettermark fallback) ----

function ShopImage({ url, name }: { url: string; name: string }) {
  const [imgError, setImgError] = useState(false);
  const domain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  return (
    <div className="w-12 h-12 shrink-0 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-alt)] flex items-center justify-center overflow-hidden">
      {domain && !imgError ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          alt=""
          aria-hidden="true"
          className="w-8 h-8 object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-lg font-bold text-[var(--ds-text-subtle)] select-none">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

type ReviewState = {
  adminNote: string;
  editingRejection: boolean;
  rejectionLongText: string;
  rejectionToken: string | null;
  reviewId: number | null;
};

type ReviewAction =
  | { type: "close" }
  | { type: "openApprove"; id: number }
  | {
      type: "openReject";
      adminNote: string;
      editingRejection: boolean;
      id: number;
      rejectionLongText: string;
      rejectionToken: string | null;
    }
  | { type: "setAdminNote"; value: string }
  | { type: "setRejectionLongText"; value: string };

const EMPTY_REVIEW_STATE: ReviewState = {
  adminNote: "",
  editingRejection: false,
  rejectionLongText: "",
  rejectionToken: null,
  reviewId: null,
};

function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case "close":
      return EMPTY_REVIEW_STATE;
    case "openApprove":
      return {
        ...EMPTY_REVIEW_STATE,
        reviewId: action.id,
      };
    case "openReject":
      return {
        adminNote: action.adminNote,
        editingRejection: action.editingRejection,
        rejectionLongText: action.rejectionLongText,
        rejectionToken: action.rejectionToken,
        reviewId: -action.id,
      };
    case "setAdminNote":
      return { ...state, adminNote: action.value };
    case "setRejectionLongText":
      return { ...state, rejectionLongText: action.value };
  }
}

export function SuggestionsTab() {
  const { locale, messages } = useI18n();
  const { user } = useAuth();
  const statusLabels = useStatusLabels();
  const common = messages.common;
  const submissionsMessages = messages.submissions;
  const [filter, setFilter] = useState<SubmissionStatus>("pending");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("asc");
  const [reviewState, dispatchReview] = useReducer(reviewReducer, EMPTY_REVIEW_STATE);
  const { phase: savedPhase, show: showSaved } = useSaveNotification();
  const [editSubmission, setEditSubmission] = useState<Submission | null>(null);
  const [deleteSubmissionId, setDeleteSubmissionId] = useState<number | null>(null);

  const { data: submissions = [], isLoading } = useAdminSubmissions(filter);
  const { data: categories = [] } = useAdminCategories();
  const reviewMutation = useReviewSubmission();
  const deleteSubmissionMutation = useDeleteSubmission();
  const deleteSubmissionTarget =
    submissions.find((entry) => entry.id === deleteSubmissionId) ?? null;

  const reviewing = submissions.find((s) => s.id === Math.abs(reviewState.reviewId ?? 0));

  usePersistedTextareaHeight(
    "admin-note",
    "submissions:textarea:admin-note",
    reviewState.reviewId !== null && reviewState.reviewId > 0,
  );

  function handleReviewSave(close = true) {
    if (reviewState.reviewId === null) return;
    reviewMutation.mutate(
      {
        id: Math.abs(reviewState.reviewId),
        status: reviewState.reviewId > 0 ? "approved" : "rejected",
        adminNote: reviewState.adminNote,
        rejectionLongText: reviewState.reviewId < 0 ? reviewState.rejectionLongText : undefined,
        rejectionToken:
          reviewState.reviewId < 0 ? (reviewState.rejectionToken ?? undefined) : undefined,
      },
      {
        onSuccess: close ? () => dispatchReview({ type: "close" }) : showSaved,
      },
    );
  }

  useKeyboardSave(
    () => {
      if (!reviewMutation.isPending) handleReviewSave(false);
    },
    reviewState.editingRejection && reviewState.reviewId !== null,
  );

  const handleCommentPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text");
    if (!pastedText.includes("[REJECT_TOKEN]")) return;
    e.preventDefault();
    const token = reviewState.rejectionToken ?? "";
    const replaced = pastedText.replace(/\[REJECT_TOKEN\]/g, token);
    const ta = e.currentTarget;
    const newValue =
      reviewState.adminNote.slice(0, ta.selectionStart) +
      replaced +
      reviewState.adminNote.slice(ta.selectionEnd);
    dispatchReview({ type: "setAdminNote", value: newValue });
  };

  function closeReview() {
    dispatchReview({ type: "close" });
  }

  function openApproveReview(id: number) {
    dispatchReview({ type: "openApprove", id });
  }

  function openRejectReview(submission: Submission, editingRejection: boolean) {
    dispatchReview({
      type: "openReject",
      id: submission.id,
      adminNote: editingRejection ? (submission.adminNote ?? "") : "",
      editingRejection,
      rejectionLongText: editingRejection ? (submission.rejectionLongText ?? "") : "",
      rejectionToken: editingRejection
        ? (submission.rejectionToken ?? null)
        : generateRejectionToken(),
    });
  }

  const sorted = useMemo(
    () =>
      [...submissions].sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortDir === "asc" ? diff : -diff;
      }),
    [submissions, sortDir],
  );

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const reviewTitle = reviewState.editingRejection
    ? submissionsMessages.suggestions.reviewEditRejectionTitle
    : reviewState.reviewId !== null && reviewState.reviewId > 0
      ? submissionsMessages.suggestions.reviewApproveTitle
      : submissionsMessages.suggestions.reviewRejectTitle;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          storageKey={getSegmentedStorageKey(user?.id, "submissions:suggestions:status")}
          options={[
            {
              value: "pending" as SubmissionStatus,
              label: statusLabels.pending,
              icon: <SFClockFill className="w-3.5 h-3.5" />,
            },
            {
              value: "onhold" as SubmissionStatus,
              label: statusLabels.onhold,
              icon: <SFPauseCircleFill className="w-3.5 h-3.5" />,
            },
            {
              value: "rejected" as SubmissionStatus,
              label: statusLabels.rejected,
              icon: <SFXmarkCircleFill className="w-3.5 h-3.5" />,
            },
          ]}
        />
        <SegmentedControl
          value={sortDir}
          onChange={setSortDir}
          storageKey={getSegmentedStorageKey(user?.id, "submissions:suggestions:sort")}
          options={[
            {
              value: "asc" as const,
              label: submissionsMessages.sort.oldFirst,
              icon: <SFArrowUpCircleFill className="w-3.5 h-3.5" />,
            },
            {
              value: "desc" as const,
              label: submissionsMessages.sort.newFirst,
              icon: <SFArrowDownCircleFill className="w-3.5 h-3.5" />,
            },
          ]}
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => `sk-${i}`).map((key) => (
            <ItemCard key={key} className="h-24 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && submissions.length === 0 && (
        <ContentUnavailableView
          className="flex-1"
          icon={<SFTrayFill aria-hidden />}
          title={`${submissionsMessages.suggestions.nonePrefix} ${statusLabels[filter].toLowerCase()} ${submissionsMessages.tabs.suggestions}.`}
          subtitle={submissionsMessages.suggestions.noneHint}
        />
      )}

      <SuggestionsSubmissionList
        categoryMap={categoryMap}
        filter={filter}
        locale={locale}
        onDeleteSubmission={setDeleteSubmissionId}
        onEditSubmission={setEditSubmission}
        onOpenApprove={openApproveReview}
        onOpenReject={(submission, editing) => openRejectReview(submission, editing)}
        reviewMutation={reviewMutation}
        sorted={sorted}
        statusLabels={statusLabels}
        submissionsMessages={submissionsMessages}
      />

      {editSubmission !== null && (
        <ShopEditCard
          submissionId={editSubmission.id}
          initialData={{
            name: editSubmission.shopName,
            url: editSubmission.shopUrl,
            description: editSubmission.description ?? "",
            categoryIds: editSubmission.categoryIds ?? [],
            region: Array.isArray(editSubmission.region) ? editSubmission.region : [],
            shipping: editSubmission.shipping ?? "",
            contactEmail: editSubmission.contactEmail ?? "",
            socialMedia: editSubmission.socialMedia ?? {},
          }}
          onClose={() => setEditSubmission(null)}
          onSaved={() => setEditSubmission(null)}
        />
      )}

      <ApproveSubmissionReviewCard
        adminNote={reviewState.adminNote}
        commentPlaceholder={submissionsMessages.suggestions.commentPlaceholder}
        commentLabel={submissionsMessages.suggestions.comment}
        errorMessage={reviewMutation.error?.message ?? common.unknownError}
        errorPrefix={submissionsMessages.suggestions.reviewErrorPrefix}
        isError={reviewMutation.isError}
        isPending={reviewMutation.isPending}
        onAdminNoteChange={(value) => dispatchReview({ type: "setAdminNote", value })}
        onAdminNotePaste={handleCommentPaste}
        onClose={closeReview}
        onSubmit={() => handleReviewSave()}
        open={reviewState.reviewId !== null && reviewState.reviewId > 0 && reviewing !== undefined}
        optionalLabel={submissionsMessages.suggestions.optional}
        reviewTitle={reviewTitle}
        reviewing={reviewing ?? null}
        savedPhase={savedPhase}
        savedLabel={common.saved}
        submitLabel={submissionsMessages.suggestions.accept}
        cancelLabel={common.cancel}
      />

      <RejectDialog
        open={reviewState.reviewId !== null && reviewState.reviewId < 0 && reviewing !== undefined}
        onClose={closeReview}
        title={reviewTitle}
        headerIcon={
          reviewState.editingRejection ? (
            <SFLongTextPageAndPencilFill className={dialogHeaderIconClass} />
          ) : (
            <SFXmarkCircleFill className={dialogHeaderIconClass} />
          )
        }
        name={reviewing?.shopName ?? ""}
        url={reviewing?.shopUrl ?? ""}
        adminNote={reviewState.adminNote}
        onAdminNoteChange={(value) => dispatchReview({ type: "setAdminNote", value })}
        onAdminNotePaste={handleCommentPaste}
        rejectionLongText={reviewState.rejectionLongText}
        onRejectionLongTextChange={(value) =>
          dispatchReview({ type: "setRejectionLongText", value })
        }
        onSubmit={() => handleReviewSave()}
        isPending={reviewMutation.isPending}
        isError={reviewMutation.isError}
        errorMessage={reviewMutation.error?.message ?? common.unknownError}
        submitLabel={
          reviewState.editingRejection ? common.save : submissionsMessages.suggestions.decline
        }
        submitVariant={reviewState.editingRejection ? "primary" : "danger"}
        submitIcon={
          reviewState.editingRejection ? (
            <SFSquareAndArrowDownFill className="w-3.5 h-3.5" />
          ) : undefined
        }
        headerRight={<SaveNotification phase={savedPhase} label={common.saved} />}
        storageKey="submissions:review-reject-size"
        adminNoteStorageKey="submissions:textarea:admin-note"
        rejectionLongStorageKey="submissions:textarea:rejection-long"
        messages={{
          cancel: common.cancel,
          comment: submissionsMessages.suggestions.comment,
          optional: submissionsMessages.suggestions.optional,
          commentPlaceholder: submissionsMessages.suggestions.rejectReasonPlaceholder,
          rejectionLongLabel: submissionsMessages.suggestions.rejectionLongLabel,
          rejectionLongPlaceholder: submissionsMessages.suggestions.rejectionLongPlaceholder,
          errorPrefix: submissionsMessages.suggestions.reviewErrorPrefix,
        }}
      />

      <Dialog
        open={deleteSubmissionId !== null && deleteSubmissionTarget !== null}
        title={submissionsMessages.suggestions.confirmDeleteTitle}
        titleIcon={<SFTrashFill className={dialogHeaderIconClass} />}
        onClose={() => setDeleteSubmissionId(null)}
      >
        <div className="px-6 py-3">
          <p className="text-sm text-[var(--ds-text-muted)]">
            <span className="font-medium">{deleteSubmissionTarget?.shopName}</span>{" "}
            {submissionsMessages.suggestions.confirmDeleteDescription}
          </p>
        </div>
        <Dialog.Footer>
          <button
            type="button"
            onClick={() => setDeleteSubmissionId(null)}
            className={dialogBtnSecondary}
          >
            {common.cancel}
          </button>
          <button
            type="button"
            disabled={deleteSubmissionMutation.isPending}
            onClick={() => {
              if (deleteSubmissionId === null) return;
              deleteSubmissionMutation.mutate(deleteSubmissionId, {
                onSuccess: () => setDeleteSubmissionId(null),
              });
            }}
            className={dialogBtnDestructive}
          >
            {deleteSubmissionMutation.isPending ? "…" : common.delete}
          </button>
        </Dialog.Footer>
      </Dialog>
    </>
  );
}

interface SuggestionsSubmissionListProps {
  categoryMap: Map<number, { name: string }>;
  filter: SubmissionStatus;
  locale: string;
  onDeleteSubmission: (id: number) => void;
  onEditSubmission: (submission: Submission) => void;
  onOpenApprove: (id: number) => void;
  onOpenReject: (submission: Submission, editing: boolean) => void;
  reviewMutation: ReturnType<typeof useReviewSubmission>;
  sorted: Submission[];
  statusLabels: Record<SubmissionStatus, string>;
  submissionsMessages: ReturnType<typeof useI18n>["messages"]["submissions"];
}

function SuggestionsSubmissionList({
  categoryMap,
  filter,
  locale,
  onDeleteSubmission,
  onEditSubmission,
  onOpenApprove,
  onOpenReject,
  reviewMutation,
  sorted,
  statusLabels,
  submissionsMessages,
}: SuggestionsSubmissionListProps) {
  return (
    <div className="space-y-3">
      {sorted.map((submission) => (
        <SuggestionsSubmissionRow
          key={submission.id}
          categoryMap={categoryMap}
          filter={filter}
          locale={locale}
          onDeleteSubmission={onDeleteSubmission}
          onEditSubmission={onEditSubmission}
          onOpenApprove={onOpenApprove}
          onOpenReject={onOpenReject}
          reviewMutation={reviewMutation}
          statusLabels={statusLabels}
          submission={submission}
          submissionsMessages={submissionsMessages}
        />
      ))}
    </div>
  );
}

interface SuggestionsSubmissionRowProps {
  categoryMap: Map<number, { name: string }>;
  filter: SubmissionStatus;
  locale: string;
  onDeleteSubmission: (id: number) => void;
  onEditSubmission: (submission: Submission) => void;
  onOpenApprove: (id: number) => void;
  onOpenReject: (submission: Submission, editing: boolean) => void;
  reviewMutation: ReturnType<typeof useReviewSubmission>;
  statusLabels: Record<SubmissionStatus, string>;
  submission: Submission;
  submissionsMessages: ReturnType<typeof useI18n>["messages"]["submissions"];
}

function SuggestionsSubmissionRow({
  categoryMap,
  filter,
  locale,
  onDeleteSubmission,
  onEditSubmission,
  onOpenApprove,
  onOpenReject,
  reviewMutation,
  statusLabels,
  submission,
  submissionsMessages,
}: SuggestionsSubmissionRowProps) {
  return (
    <div className="bg-[var(--ds-surface)] rounded-2xl border border-[var(--ds-border-subtle)] p-4 flex items-stretch gap-4">
      <ShopImage url={submission.shopUrl} name={submission.shopName} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-[var(--ds-text)]">{submission.shopName}</p>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[submission.status as SubmissionStatus]}`}
          >
            {statusLabels[submission.status as SubmissionStatus]}
          </span>
        </div>
        <a
          href={submission.shopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--color-primary)] hover:underline truncate block"
        >
          {submission.shopUrl}
        </a>
        {submission.description && (
          <p className="text-sm text-[var(--ds-text-muted)] mt-1">{submission.description}</p>
        )}
        {submission.categoryIds && submission.categoryIds.length > 0 && (
          <div className="mt-1">
            <ShopCategoryBadges
              categories={submission.categoryIds.flatMap((id) => {
                const category = categoryMap.get(id);
                return category ? [{ id, name: category.name }] : [];
              })}
            />
          </div>
        )}
        <div className="flex gap-3 mt-1.5 text-xs text-[var(--ds-text-subtle)]">
          <span>
            {new Date(submission.createdAt).toLocaleString(locale, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {submission.submitterEmail && <span>✉ {submission.submitterEmail}</span>}
        </div>
      </div>

      <SuggestionsSubmissionActions
        filter={filter}
        onDeleteSubmission={onDeleteSubmission}
        onEditSubmission={onEditSubmission}
        onOpenApprove={onOpenApprove}
        onOpenReject={onOpenReject}
        reviewMutation={reviewMutation}
        submission={submission}
        submissionsMessages={submissionsMessages}
      />
    </div>
  );
}

interface SuggestionsSubmissionActionsProps {
  filter: SubmissionStatus;
  onDeleteSubmission: (id: number) => void;
  onEditSubmission: (submission: Submission) => void;
  onOpenApprove: (id: number) => void;
  onOpenReject: (submission: Submission, editing: boolean) => void;
  reviewMutation: ReturnType<typeof useReviewSubmission>;
  submission: Submission;
  submissionsMessages: ReturnType<typeof useI18n>["messages"]["submissions"];
}

function SuggestionsSubmissionActions({
  filter,
  onDeleteSubmission,
  onEditSubmission,
  onOpenApprove,
  onOpenReject,
  reviewMutation,
  submission,
  submissionsMessages,
}: SuggestionsSubmissionActionsProps) {
  if (filter === "pending") {
    return (
      <div className="flex flex-row items-end gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onEditSubmission(submission)}
          className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
        >
          <SFLongTextPageAndPencilFill className="w-3.5 h-3.5" />
          {submissionsMessages.suggestions.edit}
        </button>
        <button
          type="button"
          onClick={() => onOpenApprove(submission.id)}
          className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-success-border)] rounded-control text-[var(--ds-btn-success-text)] text-sm hover:border-[var(--ds-btn-success-hover-border)] hover:bg-[var(--ds-btn-success-hover-bg)] transition-colors"
        >
          <SFCheckmarkCircleFill className="w-3.5 h-3.5" />
          {submissionsMessages.suggestions.approve}
        </button>
        <button
          type="button"
          onClick={() =>
            reviewMutation.mutate({
              id: submission.id,
              status: "onhold",
              adminNote: "",
            })
          }
          className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-warning-border)] rounded-control text-[var(--ds-btn-warning-text)] text-sm hover:border-[var(--ds-btn-warning-hover-border)] hover:bg-[var(--ds-btn-warning-hover-bg)] transition-colors"
        >
          <SFPauseCircleFill className="w-3.5 h-3.5" />
          {submissionsMessages.suggestions.onhold}
        </button>
        <button
          type="button"
          onClick={() => onOpenReject(submission, false)}
          className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
        >
          <SFXmarkCircleFill className="w-3.5 h-3.5" />
          {submissionsMessages.suggestions.reject}
        </button>
      </div>
    );
  }

  if (filter === "onhold") {
    return (
      <div className="flex flex-row items-end gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onEditSubmission(submission)}
          className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
        >
          <SFLongTextPageAndPencilFill className="w-3.5 h-3.5" />
          {submissionsMessages.suggestions.edit}
        </button>
        <button
          type="button"
          onClick={() =>
            reviewMutation.mutate({
              id: submission.id,
              status: "pending",
              adminNote: "",
            })
          }
          disabled={reviewMutation.isPending}
          className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-success-border)] rounded-control text-[var(--ds-btn-success-text)] text-sm hover:border-[var(--ds-btn-success-hover-border)] hover:bg-[var(--ds-btn-success-hover-bg)] transition-colors disabled:opacity-50"
        >
          <SFArrowCounterclockwise className="w-3.5 h-3.5" />
          {submissionsMessages.suggestions.restore}
        </button>
        <button
          type="button"
          onClick={() => onOpenReject(submission, false)}
          className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
        >
          <SFXmarkCircleFill className="w-3.5 h-3.5" />
          {submissionsMessages.suggestions.reject}
        </button>
        <button
          type="button"
          onClick={() => onDeleteSubmission(submission.id)}
          className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
        >
          <SFTrashFill className="w-3.5 h-3.5" />
          {submissionsMessages.suggestions.delete}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-row items-end gap-1.5 shrink-0">
      <button
        type="button"
        onClick={() => onOpenReject(submission, true)}
        className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
      >
        <SFLongTextPageAndPencilFill className="w-3.5 h-3.5" />
        {submissionsMessages.suggestions.editRejectionInfo}
      </button>
      {submission.rejectionToken ? (
        <button
          type="button"
          onClick={() =>
            window.open(
              `${import.meta.env.VITE_FRONTEND_URL ?? (import.meta.env.DEV ? "http://localhost:4321" : "https://lmaa.space")}/rejected/${submission.rejectionToken}`,
              "_blank",
            )
          }
          className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-warning-border)] rounded-control text-[var(--ds-btn-warning-text)] text-sm hover:border-[var(--ds-btn-warning-hover-border)] hover:bg-[var(--ds-btn-warning-hover-bg)] transition-colors"
        >
          <SFInfoCircleFill className="w-3.5 h-3.5" />
          {submissionsMessages.suggestions.info}
        </button>
      ) : (
        <button
          type="button"
          onClick={() =>
            reviewMutation.mutate({
              id: submission.id,
              status: "pending",
              adminNote: "",
            })
          }
          disabled={reviewMutation.isPending}
          className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-success-border)] rounded-control text-[var(--ds-btn-success-text)] text-sm hover:border-[var(--ds-btn-success-hover-border)] hover:bg-[var(--ds-btn-success-hover-bg)] transition-colors disabled:opacity-50"
        >
          <SFArrowCounterclockwise className="w-3.5 h-3.5" />
          {submissionsMessages.suggestions.setToOpen}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDeleteSubmission(submission.id)}
        className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
      >
        <SFTrashFill className="w-3.5 h-3.5" />
        {submissionsMessages.suggestions.delete}
      </button>
    </div>
  );
}

interface ApproveSubmissionReviewCardProps {
  adminNote: string;
  cancelLabel: string;
  commentLabel: string;
  commentPlaceholder: string;
  errorMessage: string;
  errorPrefix: string;
  isError: boolean;
  isPending: boolean;
  onAdminNoteChange: (value: string) => void;
  onAdminNotePaste: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
  onClose: () => void;
  onSubmit: () => void;
  open: boolean;
  optionalLabel: string;
  reviewTitle: string;
  reviewing: Submission | null;
  savedLabel: string;
  savedPhase: ReturnType<typeof useSaveNotification>["phase"];
  submitLabel: string;
}

function ApproveSubmissionReviewCard({
  adminNote,
  cancelLabel,
  commentLabel,
  commentPlaceholder,
  errorMessage,
  errorPrefix,
  isError,
  isPending,
  onAdminNoteChange,
  onAdminNotePaste,
  onClose,
  onSubmit,
  open,
  optionalLabel,
  reviewTitle,
  reviewing,
  savedLabel,
  savedPhase,
  submitLabel,
}: ApproveSubmissionReviewCardProps) {
  return (
    <OverlayCard
      open={open}
      onClose={onClose}
      size={{ storageKey: "submissions:review-approve-size", defaultWidth: 448 }}
      aria-label={reviewTitle}
    >
      {reviewing && (
        <>
          <OverlayCard.Header>
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <SFArrowUpCircleFill className={dialogHeaderIconClass} />
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
                aria-label="Copy URL"
              >
                <SFDocumentOnDocumentFill className="w-4 h-4" />
              </button>
            </div>
          </OverlayCard.Header>

          <OverlayCard.Body className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="admin-note"
                className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
              >
                {commentLabel}{" "}
                <span className="text-[var(--ds-text-subtle)] font-normal">{optionalLabel}</span>
              </label>
              <MarkdownTextarea
                id="admin-note"
                value={adminNote}
                onChange={onAdminNoteChange}
                onPaste={onAdminNotePaste}
                rows={3}
                placeholder={commentPlaceholder}
              />
              <CharCounter value={adminNote} max={1200} className="block mt-1 text-right" />
            </div>

            {isError && (
              <p className="text-sm text-red-600">
                {errorPrefix} {errorMessage}
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
                  <SFCheckmarkCircleFill className="w-3.5 h-3.5" />
                  {submitLabel}
                </>
              )}
            </button>
          </OverlayCard.Footer>
        </>
      )}
    </OverlayCard>
  );
}
