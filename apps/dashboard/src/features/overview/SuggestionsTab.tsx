import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { type SubmissionStatus } from "@lmaa/shared";

import { ItemCard } from "@/components/ui/Card.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { ShopCategoryBadges } from "@/components/ui/ShopCategoryBadges.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useAdminCategories } from "@/features/content/hooks/useAdminCategories.ts";
import { useAdminSubmissions } from "@/features/overview/hooks/useSubmissions.ts";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";
import {
  ArrowCircleDownIcon,
  ArrowCircleUpIcon,
  ClockIcon,
  FileTextIcon,
  PauseCircleIcon,
  TrayIcon,
  XCircleIcon,
} from "@phosphor-icons/react";

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

export function SuggestionsTab() {
  const { locale, messages } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const statusLabels = useStatusLabels();
  const submissionsMessages = messages.submissions;
  const [filter, setFilter] = useState<SubmissionStatus>("pending");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("asc");

  const { data: submissions = [], isLoading } = useAdminSubmissions(filter);
  const { data: categories = [] } = useAdminCategories();

  const sorted = useMemo(
    () =>
      [...submissions].sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortDir === "asc" ? diff : -diff;
      }),
    [submissions, sortDir],
  );

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

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
              icon: <ClockIcon weight="duotone" className="w-3.5 h-3.5" />,
            },
            {
              value: "onhold" as SubmissionStatus,
              label: statusLabels.onhold,
              icon: <PauseCircleIcon weight="duotone" className="w-3.5 h-3.5" />,
            },
            {
              value: "rejected" as SubmissionStatus,
              label: statusLabels.rejected,
              icon: <XCircleIcon weight="duotone" className="w-3.5 h-3.5" />,
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
              icon: <ArrowCircleUpIcon weight="duotone" className="w-3.5 h-3.5" />,
            },
            {
              value: "desc" as const,
              label: submissionsMessages.sort.newFirst,
              icon: <ArrowCircleDownIcon weight="duotone" className="w-3.5 h-3.5" />,
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
          icon={<TrayIcon weight="duotone" aria-hidden />}
          title={`${submissionsMessages.suggestions.nonePrefix} ${statusLabels[filter].toLowerCase()} ${submissionsMessages.tabs.suggestions}.`}
          subtitle={submissionsMessages.suggestions.noneHint}
        />
      )}

      {!isLoading && submissions.length > 0 && (
        <div className="space-y-3">
          {sorted.map((submission) => (
            <div
              key={submission.id}
              className="bg-[var(--ds-surface)] rounded-2xl border border-[var(--ds-border-subtle)] p-4 flex items-stretch gap-4"
            >
              <ShopImage url={submission.shopUrl} name={submission.shopName} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[var(--ds-text)]">{submission.shopName}</p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[submission.status]}`}
                  >
                    {statusLabels[submission.status]}
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
                  <p className="text-sm text-[var(--ds-text-muted)] mt-1">
                    {submission.description}
                  </p>
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

              <div className="flex flex-row items-end gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate(`/reports/suggestions/${submission.id}`)}
                  className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
                >
                  <FileTextIcon weight="duotone" className="w-3.5 h-3.5" />
                  {submissionsMessages.suggestions.edit}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
