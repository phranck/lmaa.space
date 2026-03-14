import {
  FileTextIcon,
  TrayIcon,
} from "@phosphor-icons/react";
import { useMemo } from "react";
import { useNavigate } from "react-router";

import { type SubmissionStatus } from "@lmaa/shared";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAdminSubmissions } from "@/features/overview/hooks/useSubmissions.ts";

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

export function SuggestionsTab({
  filter,
}: {
  filter: "pending" | "onhold" | "rejected";
}) {
  const { locale, messages } = useI18n();
  const navigate = useNavigate();
  const statusLabels = useStatusLabels();
  const submissionsMessages = messages.submissions;

  const { data: submissions = [], isLoading } = useAdminSubmissions(filter);
  const columns = useMemo<ColumnDef<(typeof submissions)[number]>[]>(
    () => [
      {
        id: "shop",
        header: messages.shops.table.shop,
        className: "max-w-[30rem]",
        sortKey: (submission) => submission.shopName.toLowerCase(),
        cell: (submission) => (
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium truncate text-[var(--ds-text)]">{submission.shopName}</p>
              <span
                className={`px-2 rounded-full text-[10px] leading-[18px] font-medium ${STATUS_COLORS[submission.status]}`}
              >
                {statusLabels[submission.status]}
              </span>
              {submission.readyForReview && (
                <span className="px-2.5 rounded-full text-[11px] leading-[18px] font-semibold bg-[var(--ds-badge-review-bg)] text-[var(--ds-badge-review-text)]">
                  {submissionsMessages.suggestions.reviewBadge}
                </span>
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
        ),
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
            {submission.submitterEmail && (
              <div>{submission.submitterEmail}</div>
            )}
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
            <button
              type="button"
              onClick={() => navigate(`/reports/suggestions/${submission.id}`)}
              className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] hover:bg-[var(--ds-btn-neutral-hover-bg)] transition-colors"
            >
              <FileTextIcon weight="duotone" className="w-3.5 h-3.5" />
              {submissionsMessages.suggestions.edit}
            </button>
          </div>
        ),
      },
    ],
    [locale, messages.shops.table.shop, navigate, statusLabels, submissionsMessages],
  );

  return (
    <>
      {isLoading && (
        <div className="space-y-px">
          {Array.from({ length: 4 }, (_, i) => `sk-${i}`).map((key) => (
            <div
              key={key}
              className="h-14 bg-[var(--ds-surface)] animate-pulse border-b border-[var(--ds-border-subtle)]"
            />
          ))}
        </div>
      )}

      {!isLoading && submissions.length === 0 && (
        <ContentUnavailableView
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
            initialSort={{ id: "shop", dir: "asc" }}
            allowUnsorted={false}
          />
        </div>
      )}
    </>
  );
}
