import { ItemCard } from "@/components/ui/Card.tsx";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useAdminCategories } from "@/features/categories/hooks/useAdminCategories.ts";
import { ShopDeleteReasonCard } from "@/features/shops/ShopDeleteReasonCard.tsx";
import { ShopEditCard } from "@/features/shops/ShopEditCard.tsx";
import { useDeleteShop } from "@/features/shops/hooks/useAdminShops.ts";
import {
  useAdminSubmissions,
  useDeadLinkReports,
  useDeleteShopFromDeadLinks,
  useDeleteSubmission,
  useDismissDeadLink,
  useDismissShopConcern,
  useReviewSubmission,
  useShopConcernReports,
} from "@/features/submissions/hooks/useAdminSubmissions.ts";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";
import type { Submission, SubmissionStatus } from "@lmaa/shared";
import { Checkbox } from "@lmaa/ui";
import { useState } from "react";
import {
  SFArrowCounterclockwise,
  SFArrowDownCircleFill,
  SFArrowUpCircleFill,
  SFArrowUpRightSquareFill,
  SFCheckmark,
  SFCheckmarkCircleFill,
  SFClockFill,
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

function VorschlaegeTab() {
  const { locale, messages } = useI18n();
  const { user } = useAuth();
  const statusLabels = useStatusLabels();
  const common = messages.common;
  const submissionsMessages = messages.submissions;
  const [filter, setFilter] = useState<SubmissionStatus>("pending");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("asc");
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState("");
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
              value: "approved" as SubmissionStatus,
              label: statusLabels.approved,
              icon: <SFCheckmarkCircleFill className="w-3.5 h-3.5" />,
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
          icon={<SFTrayFill aria-hidden />}
          title={`${submissionsMessages.suggestions.nonePrefix} ${statusLabels[filter].toLowerCase()} ${submissionsMessages.tabs.suggestions.toLowerCase()}.`}
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
                    setReviewId(-sub.id);
                    setAdminNote("");
                    setSendFeedback(!!sub.submitterEmail);
                  }}
                  className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors mr-6"
                >
                  <SFXmarkCircleFill className="w-3.5 h-3.5" />
                  {submissionsMessages.suggestions.reject}
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
                  onClick={() => setEditSubmission(sub)}
                  className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
                >
                  <SFLongTextPageAndPencilFill className="w-3.5 h-3.5" />
                  {submissionsMessages.suggestions.edit}
                </button>
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
              </div>
            )}
            {filter === "rejected" && (
              <div className="flex flex-row items-end gap-1.5 shrink-0">
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
          }}
          onClose={() => setEditSubmission(null)}
          onSaved={() => setEditSubmission(null)}
        />
      )}

      {/* Review Modal */}
      {reviewId !== null && reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setReviewId(null)}
            aria-label={common.cancel}
          />
          <div className="relative bg-[var(--ds-surface)] rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h3 className="font-bold text-[var(--ds-text)] mb-1">
              {reviewId > 0
                ? submissionsMessages.suggestions.reviewApproveTitle
                : submissionsMessages.suggestions.reviewRejectTitle}
            </h3>
            <p className="text-sm text-[var(--ds-text-muted)] mb-4">{reviewing.shopName}</p>

            <label
              htmlFor="admin-note"
              className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
            >
              {submissionsMessages.suggestions.comment}{" "}
              <span className="text-[var(--ds-text-subtle)] font-normal">
                {submissionsMessages.suggestions.optional}
              </span>
            </label>
            <textarea
              id="admin-note"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder={
                reviewId < 0
                  ? submissionsMessages.suggestions.rejectReasonPlaceholder
                  : submissionsMessages.suggestions.commentPlaceholder
              }
              className="w-full px-4 py-2.5 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm text-[var(--ds-text)] resize-none mb-3"
            />

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
                className="mb-4"
              />
            )}

            {reviewMutation.isError && (
              <p className="text-sm text-red-600 mb-3">
                {submissionsMessages.suggestions.reviewErrorPrefix}{" "}
                {reviewMutation.error?.message ?? common.unknownError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setReviewId(null)}
                className="flex-1 py-2.5 border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors"
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
                      sendFeedback,
                    },
                    {
                      onSuccess: () => {
                        setReviewId(null);
                        setAdminNote("");
                        setSendFeedback(false);
                      },
                    },
                  )
                }
                className={`flex-1 py-2.5 rounded-control text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                  reviewId > 0
                    ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
                    : "bg-red-500 hover:bg-red-600"
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

      <ConfirmDialog
        open={deleteSubmissionId !== null && deleteSubmissionTarget !== null}
        title={submissionsMessages.suggestions.confirmDeleteTitle}
        description={
          <>
            <span className="font-medium">{deleteSubmissionTarget?.shopName}</span>{" "}
            {submissionsMessages.suggestions.confirmDeleteDescription}
          </>
        }
        isPending={deleteSubmissionMutation.isPending}
        onConfirm={() => {
          if (deleteSubmissionId === null) return;
          deleteSubmissionMutation.mutate(deleteSubmissionId, {
            onSuccess: () => setDeleteSubmissionId(null),
          });
        }}
        onCancel={() => setDeleteSubmissionId(null)}
      />
    </>
  );
}

function DefekteLinksTab() {
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

type Tab = "vorschlaege" | "defekte-links" | "shop-meldungen";

function getInitialTab(): Tab {
  const params = new URLSearchParams(window.location.search);
  const t = params.get("tab");
  if (t === "defekte-links" || t === "shop-meldungen") return t;
  return "vorschlaege";
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
    <div>
      <PageHeader title={submissionsMessages.title}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          storageKey={getSegmentedStorageKey(user?.id, "submissions:tab")}
          options={[
            {
              value: "vorschlaege" as const,
              label: submissionsMessages.tabs.suggestions,
              badge:
                pendingCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--ds-badge-pending-bg)] text-[var(--ds-badge-pending-text)]">
                    {pendingCount}
                  </span>
                ) : undefined,
            },
            {
              value: "defekte-links" as const,
              label: submissionsMessages.tabs.deadLinks,
              badge:
                deadLinkCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)]">
                    {deadLinkCount}
                  </span>
                ) : undefined,
            },
            {
              value: "shop-meldungen" as const,
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

      {tab === "vorschlaege" && <VorschlaegeTab />}
      {tab === "defekte-links" && <DefekteLinksTab />}
      {tab === "shop-meldungen" && <ShopMeldungenTab />}
    </div>
  );
}

// ─── Shop-Meldungen Tab ───────────────────────────────────────────────────────

function ShopMeldungenTab() {
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
      <div className="p-6 text-center text-[var(--ds-text-subtle)] text-sm">
        {submissionsMessages.shopReports.loading}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <ContentUnavailableView
        icon={<SFStorefrontFill aria-hidden />}
        title={submissionsMessages.shopReports.none}
        subtitle={submissionsMessages.shopReports.noneHint}
      />
    );
  }

  return (
    <>
      <div className="p-6 space-y-3">
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
