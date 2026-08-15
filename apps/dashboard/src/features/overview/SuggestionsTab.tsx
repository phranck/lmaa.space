import { FileTextIcon, RobotIcon, SealWarningIcon, TrayIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router";

import { type ReviewVerdict, type SubmissionStatus } from "@lmaa/shared";

import { Badge } from "@/components/ui/Badge.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { SkeletonRows } from "@/components/ui/SkeletonRows.tsx";
import { StatusBadge } from "@/components/ui/StatusBadge.tsx";
import { type ColumnDef, DataTable, type SortState } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useReviewVerdictBySubmission } from "@/features/overview/hooks/useReviewJob.ts";
import { useAdminSubmissions } from "@/features/overview/hooks/useSubmissions.ts";

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  pending: "bg-[var(--ds-badge-pending-bg)] text-[var(--ds-badge-pending-text)]",
  onhold: "bg-[var(--ds-bg-elevated)] text-[var(--ds-text-muted)]",
  approved: "bg-[var(--ds-badge-success-bg)] text-[var(--ds-badge-success-text)]",
  rejected: "bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)]",
};

/**
 * The colour each recommendation carries.
 *
 * @remarks
 * A recommendation to admit and one to reject are opposite answers, so they
 * take the same colours the resulting status takes further down the table
 * rather than one shared accent that makes the reader stop and read the word.
 */
const VERDICT_COLORS: Record<ReviewVerdict, string> = {
  accept: "bg-[var(--ds-badge-success-bg)] text-[var(--ds-badge-success-text)]",
  reject: "bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)]",
  onhold: "bg-[var(--ds-bg-elevated)] text-[var(--ds-text-muted)]",
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

export function SuggestionsTab({
  filter,
  sort,
  onSortChange,
}: {
  filter: "pending" | "onhold" | "rejected";
  sort: SortState;
  onSortChange: (sort: SortState | null) => void;
}) {
  const { locale, messages } = useI18n();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const statusLabels = useStatusLabels();
  const reviewBySubmission = useReviewVerdictBySubmission();
  const submissionsMessages = messages.submissions;

  const { data: submissions = [], isLoading } = useAdminSubmissions(filter);
  const columns = useMemo<ColumnDef<(typeof submissions)[number]>[]>(
    () => [
      {
        id: "shop",
        header: messages.shops.table.shop,
        className: "max-w-[30rem]",
        sortKey: (submission) => submission.shopName.toLowerCase(),
        cell: (submission) => {
          const verdict = reviewBySubmission.get(submission.id)?.verdict ?? null;
          return (
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium truncate text-[var(--ds-text)]">{submission.shopName}</p>
                <StatusBadge
                  value={submission.status}
                  label={statusLabels[submission.status]}
                  colorMap={STATUS_COLORS}
                />
                {verdict ? (
                  <Badge
                    colorClass={VERDICT_COLORS[verdict]}
                    icon={<RobotIcon weight="duotone" className="size-3.5" />}
                  >
                    {messages.submissions.review.verdicts[verdict]}
                  </Badge>
                ) : null}
                {submission.readyForReview && (
                  <Badge
                    colorClass="bg-[var(--ds-badge-review-bg)] text-[var(--ds-badge-review-text)]"
                    icon={<SealWarningIcon weight="duotone" className="size-3.5" />}
                  >
                    {submissionsMessages.suggestions.reviewBadge}
                  </Badge>
                )}
              </div>
              <a
                href={submission.shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--color-primary)] hover:underline truncate block"
              >
                {submission.shopUrl}
              </a>
            </div>
          );
        },
      },
      {
        id: "submitted",
        header: submissionsMessages.suggestions.submittedAt,
        className: "w-52",
        sortKey: (submission) => new Date(submission.createdAt).getTime(),
        cell: (submission) => (
          <div className="text-xs text-[var(--ds-text-muted)] leading-relaxed">
            <div>
              {new Date(submission.createdAt).toLocaleString(locale, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            {submission.submitterEmail && <div>{submission.submitterEmail}</div>}
          </div>
        ),
      },
      {
        id: "rejectedAt",
        header: submissionsMessages.suggestions.rejectedAt,
        className: "w-52",
        sortKey: (submission) =>
          submission.status === "rejected" && submission.reviewedAt
            ? new Date(submission.reviewedAt).getTime()
            : 0,
        cell: (submission) =>
          submission.status === "rejected" && submission.reviewedAt ? (
            <span className="text-xs text-[var(--ds-text-subtle)]">
              {new Date(submission.reviewedAt).toLocaleString(locale, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          ) : (
            <span className="text-xs text-[var(--ds-text-subtle)]">–</span>
          ),
      },
      {
        id: "actions",
        className: "w-36",
        cell: (submission) => (
          <div className="flex justify-end">
            <TableActionButton
              onClick={() =>
                navigate(`/reports/suggestions/${submission.id}`, {
                  state: { returnTo: `${pathname}${search}` },
                })
              }
              icon={<FileTextIcon weight="duotone" className="w-3.5 h-3.5" />}
              label={submissionsMessages.suggestions.edit}
            />
          </div>
        ),
      },
    ],
    [
      locale,
      pathname,
      search,
      messages,
      navigate,
      reviewBySubmission,
      statusLabels,
      submissionsMessages,
    ],
  );

  return (
    <>
      {isLoading && (
        <div className="space-y-px">
          <SkeletonRows />
        </div>
      )}

      {!isLoading && submissions.length === 0 && (
        <ContentUnavailableView
          chromeless
          className="flex-1"
          icon={<TrayIcon weight="duotone" aria-hidden />}
          title={`${submissionsMessages.suggestions.nonePrefix} ${statusLabels[filter].toLowerCase()} ${submissionsMessages.tabs.suggestions}.`}
          subtitle={submissionsMessages.suggestions.noneHint}
        />
      )}

      {!isLoading && submissions.length > 0 && (
        <div className="-mx-3 -mt-3">
          <DataTable
            columns={columns}
            data={submissions}
            getRowKey={(submission) => submission.id}
            stickyHeader
            sort={sort}
            onSortChange={onSortChange}
            allowUnsorted={false}
          />
        </div>
      )}
    </>
  );
}
