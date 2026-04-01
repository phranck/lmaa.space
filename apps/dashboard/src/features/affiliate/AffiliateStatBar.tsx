import type { AffiliateScanJob, AffiliateScanStatus } from "@lmaa/shared";

import type { useI18n } from "@/context/I18nContext.tsx";
import { type StatCardDef, STAT_CARDS } from "@/features/affiliate/affiliate-constants.ts";

type AffiliateMessages = ReturnType<typeof useI18n>["messages"]["affiliate"];

interface AffiliateStatBarProps {
  statusFilter: string;
  onStatusFilterChange: (filter: string) => void;
  getStatValue: (key: "total" | AffiliateScanStatus) => number;
  getStatLabel: (card: StatCardDef) => string;
  job: AffiliateScanJob | null;
  isJobActive: boolean;
  cancelBatch: { mutate: (id: number) => void; isPending: boolean };
  ollamaAvailable: boolean;
  t: AffiliateMessages;
}

export function AffiliateStatBar({
  statusFilter,
  onStatusFilterChange,
  getStatValue,
  getStatLabel,
  job,
  isJobActive,
  cancelBatch,
  ollamaAvailable,
  t,
}: AffiliateStatBarProps) {
  return (
    <div className="shrink-0 bg-[var(--ds-surface)]">
      <div className="grid grid-cols-5 gap-3 px-4 pt-3 pb-3">
        {STAT_CARDS.map((card) => {
          const isActive = statusFilter === card.filterValue;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => onStatusFilterChange(isActive && card.filterValue !== "" ? "" : card.filterValue)}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all cursor-pointer ${
                isActive
                  ? `${card.activeBorder} ${card.activeGlow} bg-[var(--ds-bg-elevated)]`
                  : "border-[var(--ds-border-subtle)] bg-[var(--ds-bg-elevated)] hover:border-[var(--ds-border)]"
              }`}
            >
              <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${card.iconBg} ${card.iconColor}`}>
                {card.icon}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-muted)] truncate">
                {getStatLabel(card)}
              </p>
              <p className="text-xl font-bold text-[var(--ds-text)] ml-auto tabular-nums">{getStatValue(card.key)}</p>
            </button>
          );
        })}
      </div>

      {isJobActive && job && (
        <div className="flex items-center gap-3 mx-4 mb-3 p-3 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)]">
          <div className="w-5 h-5 shrink-0 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-[var(--ds-text)]">
                {cancelBatch.isPending ? t.batch.cancelling : t.batch.running}
              </span>
              <span className="text-[var(--ds-text-muted)]">
                {t.batch.progress
                  .replace("{completed}", String(job.completedShops + job.failedShops))
                  .replace("{total}", String(job.totalShops))}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--ds-surface-hover)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                style={{
                  width: `${job.totalShops > 0 ? ((job.completedShops + job.failedShops) / job.totalShops) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => cancelBatch.mutate(job.id)}
            disabled={cancelBatch.isPending}
            className="h-8 px-3 text-sm rounded-control border border-[var(--ds-border)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] hover:border-[var(--ds-border-strong)] disabled:opacity-50"
          >
            {cancelBatch.isPending ? t.batch.cancelling : t.batch.cancel}
          </button>
        </div>
      )}

      {!ollamaAvailable && (
        <p className="text-xs text-amber-600 dark:text-amber-400 px-4 mb-3">{t.ollamaUnavailable}</p>
      )}
    </div>
  );
}
