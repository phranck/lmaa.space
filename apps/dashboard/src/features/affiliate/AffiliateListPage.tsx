import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  GraphIcon,
  HandshakeIcon,
  MinusCircleIcon,
  PlayIcon,
  StorefrontIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import type { AffiliateScanResult, AffiliateScanStatus, AffiliateTrackingStatus } from "@lmaa/shared";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { FilterDropdown } from "@/components/ui/FilterDropdown.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageLayout } from "@/components/ui/PageLayout.tsx";
import { Toolbar } from "@/components/ui/Toolbar.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useActiveAffiliateScanJob } from "@/features/affiliate/hooks/useActiveAffiliateScanJob.ts";
import {
  useCancelBatchScan,
  useStartBatchScan,
} from "@/features/affiliate/hooks/useAffiliateScanJob.ts";
import {
  useAffiliateHealth,
  useAffiliateScans,
  useAffiliateStats,
  useDeleteAffiliateScan,
  useDeleteAllAffiliateScans,
  useUpdateAffiliateTracking,
} from "@/features/affiliate/hooks/useAffiliateScans.ts";

// -- Config --

interface StatCardDef {
  key: "total" | AffiliateScanStatus;
  filterValue: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  activeBorder: string;
  activeGlow: string;
}

const STAT_CARDS: StatCardDef[] = [
  { key: "total", filterValue: "", icon: <StorefrontIcon weight="duotone" className="w-5 h-5" />, iconBg: "bg-purple-500/12", iconColor: "text-purple-400", activeBorder: "border-purple-400", activeGlow: "shadow-[0_0_12px_rgba(168,85,247,0.35)]" },
  { key: "direct", filterValue: "direct", icon: <CheckCircleIcon weight="duotone" className="w-5 h-5" />, iconBg: "bg-green-500/12", iconColor: "text-green-400", activeBorder: "border-green-400", activeGlow: "shadow-[0_0_12px_rgba(74,222,128,0.35)]" },
  { key: "network", filterValue: "network", icon: <GraphIcon weight="duotone" className="w-5 h-5" />, iconBg: "bg-amber-500/12", iconColor: "text-amber-400", activeBorder: "border-amber-400", activeGlow: "shadow-[0_0_12px_rgba(251,191,36,0.35)]" },
  { key: "inquiry", filterValue: "inquiry", icon: <EnvelopeSimpleIcon weight="duotone" className="w-5 h-5" />, iconBg: "bg-orange-500/12", iconColor: "text-orange-400", activeBorder: "border-orange-400", activeGlow: "shadow-[0_0_12px_rgba(251,146,60,0.35)]" },
  { key: "none", filterValue: "none", icon: <MinusCircleIcon weight="duotone" className="w-5 h-5" />, iconBg: "bg-zinc-500/10", iconColor: "text-zinc-400", activeBorder: "border-zinc-400", activeGlow: "shadow-[0_0_12px_rgba(161,161,170,0.25)]" },
];

const STATUS_COLORS: Record<AffiliateScanStatus, string> = {
  direct: "bg-green-500/12 text-green-400",
  network: "bg-amber-500/12 text-amber-400",
  inquiry: "bg-orange-500/12 text-orange-400",
  none: "bg-zinc-500/10 text-zinc-400",
};

const TRACKING_COLORS: Record<AffiliateTrackingStatus, string> = {
  open: "bg-zinc-500/10 text-zinc-400",
  contacted: "bg-blue-500/12 text-blue-400",
  confirmed: "bg-green-500/12 text-green-400",
  rejected: "bg-red-500/12 text-red-400",
};

const COL_COUNT = 6;

function StatusBadge({ status, label }: { status: AffiliateScanStatus; label: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {label}
    </span>
  );
}

function TrackingBadge({ status, label }: { status: AffiliateTrackingStatus; label: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TRACKING_COLORS[status]}`}>
      {label}
    </span>
  );
}

// -- Main Page --

export function AffiliateListPage() {
  const { messages } = useI18n();
  const t = messages.affiliate;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selected, setSelected] = useState<AffiliateScanResult | null>(null);
  const [paneVisible, setPaneVisible] = useState(false);
  const [paneClosing, setPaneClosing] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  const openPane = useCallback((scan: AffiliateScanResult) => {
    setSelected(scan);
    setPaneClosing(false);
    setPaneVisible(true);
  }, []);

  const closePane = useCallback(() => {
    setPaneClosing(true);
  }, []);

  const handlePaneAnimationEnd = useCallback(() => {
    if (paneClosing) {
      setPaneVisible(false);
      setPaneClosing(false);
      setSelected(null);
    }
  }, [paneClosing]);

  useEffect(() => {
    if (!paneVisible) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePane();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paneVisible, closePane]);

  const { data: scans = [], isLoading } = useAffiliateScans({
    status: statusFilter || undefined,
    search: search || undefined,
  });
  const { data: stats } = useAffiliateStats();
  const { data: health } = useAffiliateHealth();
  const { data: job } = useActiveAffiliateScanJob();

  const startBatch = useStartBatchScan();
  const cancelBatch = useCancelBatchScan();
  const updateTracking = useUpdateAffiliateTracking();
  const deleteScan = useDeleteAffiliateScan();
  const deleteAll = useDeleteAllAffiliateScans();

  const ollamaAvailable = health?.available ?? false;
  const isJobActive = job?.status === "running" || job?.status === "pending";

  const sortedScans = [...scans].sort((a, b) => {
    const da = new Date(a.scannedAt).getTime();
    const db = new Date(b.scannedAt).getTime();
    return sortOrder === "newest" ? db - da : da - db;
  });

  function getStatValue(key: "total" | AffiliateScanStatus): number {
    if (!stats) return 0;
    if (key === "total") return stats.total;
    return stats.byStatus[key] ?? 0;
  }

  function getStatLabel(card: StatCardDef): string {
    if (card.key === "total") return t.stats.total;
    return t.status[card.key];
  }

  return (
    <PageLayout className="overflow-hidden -m-3">
      <PageHeader title={t.title}>
        <FilterDropdown
          value={sortOrder}
          onChange={setSortOrder}
          options={[
            { value: "newest", label: messages.submissions.sort.newFirst },
            { value: "oldest", label: messages.submissions.sort.oldFirst },
          ]}
          storageKey="affiliate-sort"
        />
      </PageHeader>

      {/* Fixed: Stat Cards + Batch Progress */}
      <div className="shrink-0 bg-[var(--ds-surface)]">
        <div className="grid grid-cols-5 gap-3 px-4 pt-3 pb-3">
          {STAT_CARDS.map((card) => {
            const isActive = statusFilter === card.filterValue;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setStatusFilter(isActive && card.filterValue !== "" ? "" : card.filterValue)}
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
            {/* Spinner */}
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

      {/* Scrollable table area */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
            </div>
          ) : sortedScans.length === 0 ? (
            <ContentUnavailableView
              icon={<HandshakeIcon weight="duotone" aria-hidden />}
              title={t.noScans}
              subtitle={t.noScansHint}
              className="flex-1 min-h-0"
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-[5] bg-[var(--ds-surface)]">
                <tr className="border-b border-[var(--ds-border)]">
                  <th className="text-left px-4 py-2 font-medium text-[var(--ds-text-muted)]">{t.table.shop}</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--ds-text-muted)]">{t.table.status}</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--ds-text-muted)]">{t.table.network}</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--ds-text-muted)]">{t.table.commission}</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--ds-text-muted)]">{t.table.tracking}</th>
                  <th className="text-right px-4 py-2 font-medium text-[var(--ds-text-muted)]">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {sortedScans.map((scan) => (
                  <tr
                    key={scan.id}
                    onClick={() => openPane(scan)}
                    className={`border-b border-[var(--ds-surface-hover)] cursor-pointer hover:bg-[var(--ds-surface-hover)] transition-colors ${selected?.id === scan.id ? "bg-[var(--ds-surface-hover)]" : ""}`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-[var(--ds-text)]">{scan.shopName}</div>
                      <a
                        href={scan.shopUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-[var(--ds-text-muted)] hover:text-[var(--color-primary)] flex items-center gap-1"
                      >
                        {scan.shopUrl}
                        <ArrowSquareOutIcon className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={scan.status} label={t.status[scan.status]} />
                    </td>
                    <td className="px-4 py-2.5 text-[var(--ds-text-muted)]">
                      {scan.networkName ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--ds-text-muted)]">
                      {scan.commission ?? "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <TrackingBadge status={scan.trackingStatus} label={t.tracking[scan.trackingStatus]} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteScan.mutate(scan.shopId, {
                              onSuccess: () => {
                                if (selected?.id === scan.id) closePane();
                              },
                            });
                          }}
                          className="h-7 px-3 flex items-center gap-1.5 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-xs hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
                        >
                          <TrashIcon weight="duotone" className="w-3.5 h-3.5" />
                          {messages.common.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Detail Panel - fixed, full height from header to bottom */}
      {paneVisible && selected && (
        <div
          onAnimationEnd={handlePaneAnimationEnd}
          className={`fixed top-14 right-0 bottom-0 w-80 z-20 border-l border-[var(--ds-border)] bg-[var(--ds-surface)] flex flex-col ${
            paneClosing ? "animate-[slideOut_200ms_ease-in-out_forwards]" : "animate-[slideIn_200ms_ease-in-out_forwards]"
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--ds-border)]">
            <h2 className="font-semibold text-[var(--ds-text)] truncate">{selected.shopName}</h2>
            <button
              type="button"
              onClick={closePane}
              className="shrink-0 text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
            >
              <XCircleIcon weight="duotone" className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-muted)]">
                {t.table.tracking}
              </label>
              <select
                value={selected.trackingStatus}
                onChange={(e) => {
                  const newStatus = e.target.value as AffiliateTrackingStatus;
                  updateTracking.mutate(
                    { shopId: selected.shopId, trackingStatus: newStatus, trackingNote: selected.trackingNote },
                    {
                      onSuccess: () =>
                        setSelected((prev) => (prev ? { ...prev, trackingStatus: newStatus } : null)),
                    },
                  );
                }}
                className="w-full h-9 mt-1 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-sm"
              >
                <option value="open">{t.tracking.open}</option>
                <option value="contacted">{t.tracking.contacted}</option>
                <option value="confirmed">{t.tracking.confirmed}</option>
                <option value="rejected">{t.tracking.rejected}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-muted)]">
                {t.detail.trackingNote}
              </label>
              <textarea
                value={selected.trackingNote ?? ""}
                onChange={(e) => setSelected((prev) => (prev ? { ...prev, trackingNote: e.target.value } : null))}
                onBlur={() => {
                  updateTracking.mutate({
                    shopId: selected.shopId,
                    trackingStatus: selected.trackingStatus,
                    trackingNote: selected.trackingNote,
                  });
                }}
                placeholder={t.detail.trackingNotePlaceholder}
                rows={3}
                className="w-full mt-1 p-2 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-sm resize-none"
              />
            </div>
            <DetailField label={t.detail.recommendation} value={selected.recommendation} />
            <DetailField label={t.detail.programUrl} value={selected.programUrl} isLink />
            {selected.applicationUrl !== selected.programUrl && (
              <DetailField label={t.detail.applicationUrl} value={selected.applicationUrl} isLink />
            )}
            <DetailField label={t.detail.contactEmail} value={selected.contactEmail} />
            <DetailField label={t.detail.compensationModel} value={selected.compensationModel} />
            <DetailField label={t.detail.cookieDuration} value={selected.cookieDuration} />
            <DetailField label={t.detail.payoutThreshold} value={selected.payoutThreshold} />
            <DetailField label={t.detail.requirements} value={selected.requirements} />
            <DetailField label={t.detail.notes} value={selected.notes} />
          </div>
        </div>
      )}

      <Toolbar className="sticky bottom-0 z-10 !mx-0 !mb-0">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="py-1.5 w-104 px-3 border border-[var(--ds-border)] rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] pr-7"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)]"
            >
              <XCircleIcon weight="duotone" className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-[var(--ds-text-subtle)]">
              <kbd className="inline-flex items-center justify-center h-4.5 min-w-4.5 px-1 rounded border border-[var(--ds-border)] bg-[var(--ds-surface)] font-sans leading-none">&#8984;</kbd>
              <kbd className="inline-flex items-center justify-center h-4.5 min-w-4.5 px-1 rounded border border-[var(--ds-border)] bg-[var(--ds-surface)] font-sans leading-none">K</kbd>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => startBatch.mutate(undefined)}
          disabled={!ollamaAvailable || isJobActive}
          className="h-9 px-3 flex items-center gap-1.5 rounded-control border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors ml-auto"
        >
          <PlayIcon weight="bold" className="w-3.5 h-3.5" />
          {t.scanAll}
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteAll(true)}
          disabled={sortedScans.length === 0}
          className="h-9 px-3 flex items-center gap-1.5 rounded-control border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
        >
          <TrashIcon weight="duotone" className="w-3.5 h-3.5" />
          {messages.common.delete}
        </button>
      </Toolbar>

      <OverlayCard
        open={showDeleteAll}
        onClose={() => setShowDeleteAll(false)}
        size="fixed-sm"
        aria-label={t.deleteTitle}
      >
        <OverlayCard.Header>
          <div className="flex items-center gap-3">
            <TrashIcon weight="duotone" className="w-5 h-5 text-[var(--ds-btn-danger-text)]" />
            <h3 className="font-bold text-[var(--ds-text)]">{t.deleteTitle}</h3>
          </div>
        </OverlayCard.Header>
        <OverlayCard.Body>
          <p className="text-sm text-[var(--ds-text-muted)]">{t.deleteDescription}</p>
        </OverlayCard.Body>
        <OverlayCard.Footer className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowDeleteAll(false)}
            className="h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors"
          >
            {messages.common.cancel}
          </button>
          <button
            type="button"
            disabled={deleteAll.isPending}
            onClick={() => {
              deleteAll.mutate(undefined, {
                onSuccess: () => {
                  setShowDeleteAll(false);
                  setSelected(null);
                },
              });
            }}
            className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-danger-border)] rounded-control text-sm font-medium text-[var(--ds-btn-danger-text)] hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] disabled:opacity-60 transition-colors"
          >
            <TrashIcon weight="duotone" className="w-3.5 h-3.5" />
            {deleteAll.isPending ? "..." : messages.common.delete}
          </button>
        </OverlayCard.Footer>
      </OverlayCard>
    </PageLayout>
  );
}

function DetailField({
  label,
  value,
  isLink,
}: {
  label: string;
  value: string | null;
  isLink?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-muted)]">{label}</p>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--color-primary)] hover:underline break-all flex items-center gap-1 mt-0.5"
        >
          {value}
          <ArrowSquareOutIcon className="w-3 h-3 shrink-0" />
        </a>
      ) : (
        <p className="text-sm text-[var(--ds-text)] mt-0.5 whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}
