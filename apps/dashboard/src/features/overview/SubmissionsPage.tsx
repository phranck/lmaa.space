import { ItemCard } from "@/components/ui/Card.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { Dialog, dialogBtnDestructive, dialogBtnSecondary } from "@/components/ui/Dialog.tsx";
import { MarkdownTextarea } from "@/components/ui/MarkdownTextarea.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useAdminCategories } from "@/features/content/hooks/useAdminCategories.ts";
import { useDeleteShop } from "@/features/content/hooks/useAdminShops.ts";
import { ShopDeleteReasonCard } from "@/features/content/shops/ShopDeleteReasonCard.tsx";
import { ShopEditCard } from "@/features/content/shops/ShopEditCard.tsx";
import {
  useDeadLinkReports,
  useDeleteShopFromDeadLinks,
  useDismissDeadLink,
} from "@/features/overview/hooks/useDeadLinks.ts";
import {
  useDismissShopConcern,
  useShopConcernReports,
} from "@/features/overview/hooks/useShopConcerns.ts";
import {
  useAdminSubmissions,
  useDeleteSubmission,
  useReviewSubmission,
} from "@/features/overview/hooks/useSubmissions.ts";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";
import type { Submission, SubmissionStatus } from "@lmaa/shared";
import { CharCounter, Checkbox } from "@lmaa/ui";
import { type ClipboardEvent, useEffect, useState } from "react";
import {
  SFArrowCounterclockwise,
  SFArrowDownCircleFill,
  SFArrowUpCircleFill,
  SFArrowUpRightSquareFill,
  SFCheckmark,
  SFCheckmarkCircleFill,
  SFClockFill,
  SFDocumentOnDocumentFill,
  SFInfoCircleFill,
  SFLink,
  SFLongTextPageAndPencilFill,
  SFPauseCircleFill,
  SFStorefrontFill,
  SFTrashFill,
  SFTrayFill,
  SFXmarkCircleFill,
} from "sf-symbols-lib/monochrome";

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Shop image (favicon + lettermark fallback) ───────────────────────────────

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

// ─── Sub-views ────────────────────────────────────────────────────────────────

function SuggestionsTab() {
  const { locale, messages } = useI18n();
  const { user } = useAuth();
  const statusLabels = useStatusLabels();
  const common = messages.common;
  const submissionsMessages = messages.submissions;
  const [filter, setFilter] = useState<SubmissionStatus>("pending");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("asc");
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [rejectionLongText, setRejectionLongText] = useState("");
  const [rejectionToken, setRejectionToken] = useState<string | null>(null);
  const [sendFeedback, setSendFeedback] = useState(false);
  const [editSubmission, setEditSubmission] = useState<Submission | null>(null);
  const [deleteSubmissionId, setDeleteSubmissionId] = useState<number | null>(null);

  const { data: submissions = [], isLoading } = useAdminSubmissions(filter);
  const { data: categories = [] } = useAdminCategories();
  const reviewMutation = useReviewSubmission();
  const deleteSubmissionMutation = useDeleteSubmission();
  const deleteSubmissionTarget =
    submissions.find((entry) => entry.id === deleteSubmissionId) ?? null;

  // reviewId > 0 = approve, reviewId < 0 = reject
  const reviewing = submissions.find((s) => s.id === Math.abs(reviewId ?? 0));

  useEffect(() => {
    if (reviewId !== null && reviewId < 0) {
      setRejectionToken(crypto.randomUUID().replace(/-/g, ""));
    } else {
      setRejectionToken(null);
    }
  }, [reviewId]);

  const handleCommentPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text");
    if (!pastedText.includes("[SUBMISSION_ID]")) return;
    e.preventDefault();
    const token = rejectionToken ?? "";
    const replaced = pastedText.replace(/\[SUBMISSION_ID\]/g, token);
    const ta = e.currentTarget;
    const newValue =
      adminNote.slice(0, ta.selectionStart) + replaced + adminNote.slice(ta.selectionEnd);
    setAdminNote(newValue);
  };

  useEffect(() => {
    if (reviewId === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReviewId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reviewId]);

  const sorted = [...submissions].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortDir === "asc" ? diff : -diff;
  });

  return (
    <>
      {/* Status filter + sort */}
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

      <div className="space-y-3">
        {sorted.map((sub) => (
          <div
            key={sub.id}
            className="bg-[var(--ds-surface)] rounded-2xl border border-[var(--ds-border-subtle)] p-4 flex items-stretch gap-4"
          >
            {/* Logo */}
            <ShopImage url={sub.shopUrl} name={sub.shopName} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-[var(--ds-text)]">{sub.shopName}</p>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sub.status as SubmissionStatus]}`}
                >
                  {statusLabels[sub.status as SubmissionStatus]}
                </span>
              </div>
              <a
                href={sub.shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--color-primary)] hover:underline truncate block"
              >
                {sub.shopUrl}
              </a>
              {sub.description && (
                <p className="text-sm text-[var(--ds-text-muted)] mt-1">{sub.description}</p>
              )}
              {sub.categoryIds && sub.categoryIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {sub.categoryIds.map((id) => {
                    const cat = categories.find((c) => c.id === id);
                    return cat ? (
                      <span
                        key={id}
                        className="px-2 py-0.5 rounded-full bg-[var(--ds-border)] text-[var(--ds-text-muted)] text-xs"
                      >
                        {cat.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              <div className="flex gap-3 mt-1.5 text-xs text-[var(--ds-text-subtle)]">
                <span>
                  {new Date(sub.createdAt).toLocaleString(locale, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {sub.submitterEmail && <span>✉ {sub.submitterEmail}</span>}
              </div>
            </div>

            {/* Actions */}
            {filter === "pending" && (
              <div className="flex flex-row items-end gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setReviewId(sub.id);
                    setAdminNote("");
                    setSendFeedback(!!sub.submitterEmail);
                  }}
                  className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-success-border)] rounded-control text-[var(--ds-btn-success-text)] text-sm hover:border-[var(--ds-btn-success-hover-border)] hover:bg-[var(--ds-btn-success-hover-bg)] transition-colors"
                >
                  <SFCheckmarkCircleFill className="w-3.5 h-3.5" />
                  {submissionsMessages.suggestions.approve}
                </button>
                <button
                  type="button"
                  onClick={() => setEditSubmission(sub)}
                  className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
                >
                  <SFLongTextPageAndPencilFill className="w-3.5 h-3.5" />
                  {submissionsMessages.suggestions.edit}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    reviewMutation.mutate({
                      id: sub.id,
                      status: "onhold",
                      adminNote: "",
                      sendFeedback: false,
                    })
                  }
                  className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-warning-border)] rounded-control text-[var(--ds-btn-warning-text)] text-sm hover:border-[var(--ds-btn-warning-hover-border)] hover:bg-[var(--ds-btn-warning-hover-bg)] transition-colors"
                >
                  <SFPauseCircleFill className="w-3.5 h-3.5" />
                  {submissionsMessages.suggestions.onhold}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReviewId(-sub.id);
                    setAdminNote("");
                    setSendFeedback(!!sub.submitterEmail);
                  }}
                  className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
                >
                  <SFXmarkCircleFill className="w-3.5 h-3.5" />
                  {submissionsMessages.suggestions.reject}
                </button>
              </div>
            )}
            {filter === "onhold" && (
              <div className="flex flex-row items-end gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    reviewMutation.mutate({
                      id: sub.id,
                      status: "pending",
                      adminNote: "",
                      sendFeedback: false,
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
                  onClick={() => setEditSubmission(sub)}
                  className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
                >
                  <SFLongTextPageAndPencilFill className="w-3.5 h-3.5" />
                  {submissionsMessages.suggestions.edit}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReviewId(-sub.id);
                    setAdminNote("");
                    setSendFeedback(!!sub.submitterEmail);
                  }}
                  className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
                >
                  <SFXmarkCircleFill className="w-3.5 h-3.5" />
                  {submissionsMessages.suggestions.reject}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteSubmissionId(sub.id)}
                  className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
                >
                  <SFTrashFill className="w-3.5 h-3.5" />
                  {submissionsMessages.suggestions.delete}
                </button>
              </div>
            )}
            {filter === "rejected" && (
              <div className="flex flex-row items-end gap-1.5 shrink-0">
                {sub.rejectionToken ? (
                  <button
                    type="button"
                    onClick={() =>
                      window.open(`https://lmaa.space/rejected/${sub.rejectionToken}`, "_blank")
                    }
                    className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
                  >
                    <SFInfoCircleFill className="w-3.5 h-3.5" />
                    {submissionsMessages.suggestions.info}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      reviewMutation.mutate({
                        id: sub.id,
                        status: "pending",
                        adminNote: "",
                        sendFeedback: false,
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
                  onClick={() => setDeleteSubmissionId(sub.id)}
                  className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
                >
                  <SFTrashFill className="w-3.5 h-3.5" />
                  {submissionsMessages.suggestions.delete}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit submission overlay */}
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
            socialMedia: editSubmission.socialMedia ?? {},
          }}
          onClose={() => setEditSubmission(null)}
          onSaved={() => setEditSubmission(null)}
        />
      )}

      {/* Review Modal */}
      {reviewId !== null && reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-[var(--ds-surface)] rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 pt-6 pb-3">
              <h3 className="font-bold text-[var(--ds-text)]">
                {reviewId > 0
                  ? submissionsMessages.suggestions.reviewApproveTitle
                  : submissionsMessages.suggestions.reviewRejectTitle}
              </h3>
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
            </div>

            <div className="px-6 py-3 flex flex-col gap-3">
              <div>
                <label
                  htmlFor="admin-note"
                  className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
                >
                  {submissionsMessages.suggestions.comment}{" "}
                  <span className="text-[var(--ds-text-subtle)] font-normal">
                    {submissionsMessages.suggestions.optional}
                  </span>
                </label>
                <MarkdownTextarea
                  id="admin-note"
                  value={adminNote}
                  onChange={setAdminNote}
                  onPaste={handleCommentPaste}
                  rows={3}
                  placeholder={
                    reviewId < 0
                      ? submissionsMessages.suggestions.rejectReasonPlaceholder
                      : submissionsMessages.suggestions.commentPlaceholder
                  }
                />
                <CharCounter value={adminNote} max={1200} className="block mt-1 text-right" />
              </div>

              {reviewId < 0 && (
                <div>
                  <label
                    htmlFor="rejection-long"
                    className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
                  >
                    {submissionsMessages.suggestions.rejectionLongLabel}{" "}
                    <span className="text-[var(--ds-text-subtle)] font-normal">
                      {submissionsMessages.suggestions.optional}
                    </span>
                  </label>
                  <MarkdownTextarea
                    id="rejection-long"
                    value={rejectionLongText}
                    onChange={setRejectionLongText}
                    rows={6}
                    placeholder={submissionsMessages.suggestions.rejectionLongPlaceholder}
                  />
                </div>
              )}

              {reviewing.submitterEmail && (
                <Checkbox
                  checked={sendFeedback}
                  onChange={setSendFeedback}
                  label={
                    <>
                      {submissionsMessages.suggestions.feedbackToPrefix}{" "}
                      <span className="font-medium">{reviewing.submitterEmail}</span>
                    </>
                  }
                />
              )}

              {reviewMutation.isError && (
                <p className="text-sm text-red-600">
                  {submissionsMessages.suggestions.reviewErrorPrefix}{" "}
                  {reviewMutation.error?.message ?? common.unknownError}
                </p>
              )}
            </div>

            <div className="border-t border-[var(--ds-border)] px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewId(null)}
                className="h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors"
              >
                {common.cancel}
              </button>
              <button
                type="button"
                disabled={reviewMutation.isPending}
                onClick={() =>
                  reviewMutation.mutate(
                    {
                      id: Math.abs(reviewId),
                      status: reviewId > 0 ? "approved" : "rejected",
                      adminNote,
                      rejectionLongText: reviewId < 0 ? rejectionLongText : undefined,
                      rejectionToken: reviewId < 0 ? (rejectionToken ?? undefined) : undefined,
                      sendFeedback,
                    },
                    {
                      onSuccess: () => {
                        setReviewId(null);
                        setAdminNote("");
                        setRejectionLongText("");
                        setSendFeedback(false);
                      },
                    },
                  )
                }
                className={`h-9 px-4 border rounded-control text-sm font-medium transition-colors disabled:opacity-60 ${
                  reviewId > 0
                    ? "border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)]"
                    : "border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)]"
                }`}
              >
                {reviewMutation.isPending
                  ? "…"
                  : reviewId > 0
                    ? submissionsMessages.suggestions.accept
                    : submissionsMessages.suggestions.decline}
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={deleteSubmissionId !== null && deleteSubmissionTarget !== null}
        title={submissionsMessages.suggestions.confirmDeleteTitle}
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

function DeadLinksTab() {
  const { locale, messages } = useI18n();
  const submissionsMessages = messages.submissions;
  const [deleteTarget, setDeleteTarget] = useState<{ shopId: number; shopName: string } | null>(
    null,
  );

  const { data: reports = [], isLoading } = useDeadLinkReports();
  const dismissMutation = useDismissDeadLink();
  const deleteMutation = useDeleteShopFromDeadLinks();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => `sk-${i}`).map((key) => (
          <ItemCard key={key} className="h-16 animate-pulse" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <ContentUnavailableView
        className="flex-1"
        icon={<SFLink aria-hidden />}
        title={submissionsMessages.deadLinks.none}
        subtitle={submissionsMessages.deadLinks.noneHint}
      />
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <ItemCard key={r.shopId} className="p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--ds-text)]">{r.shopName}</p>
            <a
              href={r.shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline truncate"
            >
              {r.shopUrl}
              <SFArrowUpRightSquareFill className="w-3 h-3 shrink-0" />
            </a>
          </div>

          <div className="shrink-0 text-right">
            <span className="block px-2.5 py-1 rounded-full bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)] text-xs font-semibold">
              {r.reportCount}
              {submissionsMessages.deadLinks.reportedSuffix}
            </span>
            {r.lastReportedAt && (
              <span className="block mt-1 text-xs text-[var(--ds-text-subtle)]">
                {new Date(r.lastReportedAt).toLocaleString(locale, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => dismissMutation.mutate(r.shopId)}
              disabled={dismissMutation.isPending || deleteMutation.isPending}
              className="px-3 py-1.5 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] text-[var(--ds-btn-neutral-text)] text-sm rounded-control hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors disabled:opacity-50"
            >
              <SFCheckmark className="w-3.5 h-3.5" />
              {submissionsMessages.deadLinks.keep}
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget({ shopId: r.shopId, shopName: r.shopName })}
              disabled={dismissMutation.isPending || deleteMutation.isPending}
              className="px-3 py-1.5 flex items-center gap-2 bg-[var(--ds-badge-danger-bg)] border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] text-sm rounded-control hover:bg-[var(--ds-btn-danger-hover-bg)] hover:border-[var(--ds-btn-danger-hover-border)] transition-colors disabled:opacity-50"
            >
              <SFTrashFill className="w-3.5 h-3.5" />
              {submissionsMessages.deadLinks.delete}
            </button>
          </div>
        </ItemCard>
      ))}

      {deleteTarget !== null && (
        <ShopDeleteReasonCard
          shopName={deleteTarget.shopName}
          wasReported={true}
          isPending={deleteMutation.isPending}
          onConfirm={(reason, _wasReported, mode) => {
            deleteMutation.mutate(
              { shopId: deleteTarget.shopId, reason, mode },
              { onSuccess: () => setDeleteTarget(null) },
            );
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "suggestions" | "dead-links" | "shop-reports";

function getInitialTab(): Tab {
  const params = new URLSearchParams(window.location.search);
  const t = params.get("tab");
  if (t === "dead-links" || t === "shop-reports") return t;
  return "suggestions";
}

/**
 * Submissions hub with tabs for suggestions, dead links and concern reports.
 *
 * @returns Submissions route component.
 */
export function SubmissionsPage() {
  const { messages } = useI18n();
  const { user } = useAuth();
  const submissionsMessages = messages.submissions;
  const [tab, setTab] = useState<Tab>(getInitialTab);

  const { data: pendingSubmissions = [] } = useAdminSubmissions("pending");
  const { data: deadLinkReports = [] } = useDeadLinkReports();
  const { data: shopConcerns = [] } = useShopConcernReports();

  const pendingCount = pendingSubmissions.length;
  const deadLinkCount = deadLinkReports.length;
  const concernCount = shopConcerns.length;

  return (
    <div className="flex flex-col flex-1">
      <PageHeader title={submissionsMessages.title}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          storageKey={getSegmentedStorageKey(user?.id, "submissions:tab")}
          options={[
            {
              value: "suggestions" as const,
              label: submissionsMessages.tabs.suggestions,
              badge:
                pendingCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--ds-badge-pending-bg)] text-[var(--ds-badge-pending-text)]">
                    {pendingCount}
                  </span>
                ) : undefined,
            },
            {
              value: "dead-links" as const,
              label: submissionsMessages.tabs.deadLinks,
              badge:
                deadLinkCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)]">
                    {deadLinkCount}
                  </span>
                ) : undefined,
            },
            {
              value: "shop-reports" as const,
              label: submissionsMessages.tabs.shopReports,
              badge:
                concernCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)]">
                    {concernCount}
                  </span>
                ) : undefined,
            },
          ]}
        />
      </PageHeader>

      {tab === "suggestions" && <SuggestionsTab />}
      {tab === "dead-links" && <DeadLinksTab />}
      {tab === "shop-reports" && <ShopReportsTab />}
    </div>
  );
}

// ─── Shop Reports Tab ─────────────────────────────────────────────────────────

function ShopReportsTab() {
  const { locale, messages } = useI18n();
  const submissionsMessages = messages.submissions;
  const { data: reports = [], isLoading } = useShopConcernReports();
  const dismiss = useDismissShopConcern();
  const deleteMutation = useDeleteShop();
  const [editShopId, setEditShopId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    reportId: number;
    shopId: number;
    shopName: string;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="p-3 text-center text-[var(--ds-text-subtle)] text-sm">
        {submissionsMessages.shopReports.loading}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <ContentUnavailableView
        className="flex-1"
        icon={<SFStorefrontFill aria-hidden />}
        title={submissionsMessages.shopReports.none}
        subtitle={submissionsMessages.shopReports.noneHint}
      />
    );
  }

  return (
    <>
      <div className="p-3 space-y-3">
        {reports.map((r) => (
          <ItemCard key={r.id} className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-sm text-[var(--ds-text)] truncate">{r.shopName}</p>
                <a
                  href={r.shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--ds-text-muted)] hover:underline truncate block"
                >
                  {r.shopUrl}
                </a>
              </div>
              <span className="shrink-0 text-xs text-[var(--ds-text-muted)]">
                {new Date(r.reportedAt).toLocaleString(locale, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <p className="text-sm text-[var(--ds-text)] bg-[var(--ds-surface-hover)] rounded-lg px-3 py-2 whitespace-pre-wrap">
              {r.reason}
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => dismiss.mutate(r.id)}
                disabled={dismiss.isPending}
                className="flex items-center gap-1.5 text-xs text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors disabled:opacity-50"
              >
                <SFArrowCounterclockwise className="w-3 h-3" />
                {submissionsMessages.shopReports.doneOrDecline}
              </button>
              <button
                type="button"
                onClick={() => setEditShopId(r.shopId)}
                className="h-7 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
              >
                <SFLongTextPageAndPencilFill className="w-3.5 h-3.5" />
                {submissionsMessages.shopReports.edit}
              </button>
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget({ reportId: r.id, shopId: r.shopId, shopName: r.shopName })
                }
                className="h-7 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
              >
                <SFTrashFill className="w-3.5 h-3.5" />
                {submissionsMessages.shopReports.delete}
              </button>
            </div>
          </ItemCard>
        ))}
      </div>

      {editShopId !== null && (
        <ShopEditCard
          shopId={editShopId}
          onClose={() => setEditShopId(null)}
          onSaved={() => setEditShopId(null)}
        />
      )}

      {deleteTarget !== null && (
        <ShopDeleteReasonCard
          shopName={deleteTarget.shopName}
          wasReported={true}
          isPending={deleteMutation.isPending}
          onConfirm={(reason, wasReported, mode) => {
            deleteMutation.mutate(
              { id: deleteTarget.shopId, reason, wasReported, mode },
              {
                onSuccess: () => {
                  dismiss.mutate(deleteTarget.reportId);
                  setDeleteTarget(null);
                },
              },
            );
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
