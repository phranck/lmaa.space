import { ItemCard } from "@/components/ui/Card.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { ShopDeleteReasonCard } from "@/features/content/shops/ShopDeleteReasonCard.tsx";
import {
  useDeadLinkReports,
  useDeleteShopFromDeadLinks,
  useDismissDeadLink,
} from "@/features/overview/hooks/useDeadLinks.ts";
import { useState } from "react";
import {
  SFArrowUpRightSquareFill,
  SFCheckmark,
  SFLink,
  SFTrashFill,
} from "sf-symbols-lib/monochrome";

export function DeadLinksTab() {
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
