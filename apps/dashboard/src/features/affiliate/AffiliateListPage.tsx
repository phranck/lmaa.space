import {
  ArrowSquareOutIcon,
  HandshakeIcon,
  PlayIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useReducer } from "react";

import type { AffiliateScanResult, AffiliateScanStatus } from "@lmaa/shared";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { ExportButton } from "@/components/ui/ExportButton.tsx";
import { FilterDropdown } from "@/components/ui/FilterDropdown.tsx";
import { ImportButton } from "@/components/ui/ImportButton.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { PageFooter } from "@/components/ui/PageFooter.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageLayout } from "@/components/ui/PageLayout.tsx";
import { StatusBadge as SharedStatusBadge } from "@/components/ui/StatusBadge.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { type StatCardDef, STATUS_COLORS, TRACKING_COLORS } from "@/features/affiliate/affiliate-constants.ts";
import { AffiliateDetailPane } from "@/features/affiliate/AffiliateDetailPane.tsx";
import { AffiliateStatBar } from "@/features/affiliate/AffiliateStatBar.tsx";
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
  useImportAffiliateScans,
  useUpdateAffiliateTracking,
} from "@/features/affiliate/hooks/useAffiliateScans.ts";

interface AffiliateListState {
  search: string;
  statusFilter: string;
  selected: AffiliateScanResult | null;
  paneVisible: boolean;
  paneClosing: boolean;
  sortOrder: "newest" | "oldest";
  showDeleteAll: boolean;
}

export function AffiliateListPage() {
  const { messages } = useI18n();
  const t = messages.affiliate;

  const [state, dispatch] = useReducer(
    (prev: AffiliateListState, action: Partial<AffiliateListState>): AffiliateListState => ({ ...prev, ...action }),
    { search: "", statusFilter: "", selected: null, paneVisible: false, paneClosing: false, sortOrder: "newest", showDeleteAll: false },
  );
  const { search, statusFilter, selected, paneVisible, paneClosing, sortOrder, showDeleteAll } = state;

  const openPane = useCallback((scan: AffiliateScanResult) => {
    dispatch({ selected: scan, paneClosing: false, paneVisible: true });
  }, []);

  const closePane = useCallback(() => {
    dispatch({ paneClosing: true });
  }, []);

  const handlePaneAnimationEnd = useCallback(() => {
    if (paneClosing) {
      dispatch({ paneVisible: false, paneClosing: false, selected: null });
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
  const importScans = useImportAffiliateScans();

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

  function handleExport() {
    fetch("/api/v1/admin/affiliate/export", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `affiliate-scans-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {});
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        importScans.mutate(Array.isArray(data) ? data : [data]);
      } catch {
        // invalid JSON
      }
    };
    reader.readAsText(file);
  }

  return (
    <PageLayout className="overflow-hidden -m-3">
      <PageHeader title={t.title}>
        <div className="flex items-center gap-2">
          <ImportButton
            onFileSelected={handleImport}
            label={t.importLabel}
            tooltip={t.importLabel}
          />
          <ExportButton
            onClick={handleExport}
            label={t.exportLabel}
            tooltip={t.exportLabel}
            disabled={sortedScans.length === 0}
          />
          <FilterDropdown
            value={sortOrder}
            onChange={(v) => dispatch({ sortOrder: v as "newest" | "oldest" })}
            options={[
              { value: "newest", label: messages.submissions.sort.newFirst },
              { value: "oldest", label: messages.submissions.sort.oldFirst },
            ]}
            storageKey="affiliate-sort"
          />
        </div>
      </PageHeader>

      <AffiliateStatBar
        statusFilter={statusFilter}
        onStatusFilterChange={(filter) => dispatch({ statusFilter: filter })}
        getStatValue={getStatValue}
        getStatLabel={getStatLabel}
        job={job ?? null}
        isJobActive={isJobActive}
        cancelBatch={cancelBatch}
        ollamaAvailable={ollamaAvailable}
        t={t}
      />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
            </div>
          ) : sortedScans.length === 0 ? (
            <ContentUnavailableView
              chromeless
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
                    className={`border-b border-[var(--ds-surface-hover)] cursor-pointer hover:bg-[var(--ds-surface-hover)] ${selected?.id === scan.id ? "bg-[var(--ds-surface-hover)]" : ""}`}
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
                      <SharedStatusBadge value={scan.status} label={t.status[scan.status]} colorMap={STATUS_COLORS} />
                    </td>
                    <td className="px-4 py-2.5 text-[var(--ds-text-muted)]">
                      {scan.networkName ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--ds-text-muted)]">
                      {scan.commission ?? "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <SharedStatusBadge value={scan.trackingStatus} label={t.tracking[scan.trackingStatus]} colorMap={TRACKING_COLORS} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2 justify-end">
                        <TableActionButton
                          variant="danger"
                          className="!h-7 !text-xs !gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteScan.mutate(scan.shopId, {
                              onSuccess: () => {
                                if (selected?.id === scan.id) closePane();
                              },
                            });
                          }}
                          icon={<TrashIcon weight="duotone" className="w-3.5 h-3.5" />}
                          label={messages.common.delete}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {paneVisible && selected && (
        <AffiliateDetailPane
          selected={selected}
          paneClosing={paneClosing}
          onAnimationEnd={handlePaneAnimationEnd}
          onClose={closePane}
          onSelectedChange={(updated) => dispatch({ selected: updated })}
          updateTracking={updateTracking}
          t={t}
        />
      )}

      <PageFooter>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => dispatch({ search: e.target.value })}
            placeholder={t.searchPlaceholder}
            className="py-1.5 w-104 px-3 border border-[var(--ds-border)] rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] pr-7"
          />
          {search ? (
            <button
              type="button"
              onClick={() => dispatch({ search: "" })}
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
        <TableActionButton
          variant="primary"
          onClick={() => startBatch.mutate(undefined)}
          disabled={!ollamaAvailable || isJobActive}
          className="ml-auto"
          icon={<PlayIcon weight="bold" className="w-3.5 h-3.5" />}
          label={t.scanAll}
        />
        <TableActionButton
          variant="danger"
          onClick={() => dispatch({ showDeleteAll: true })}
          disabled={sortedScans.length === 0}
          icon={<TrashIcon weight="duotone" className="w-3.5 h-3.5" />}
          label={messages.common.delete}
        />
      </PageFooter>

      <OverlayCard
        open={showDeleteAll}
        onClose={() => dispatch({ showDeleteAll: false })}
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
            onClick={() => dispatch({ showDeleteAll: false })}
            className="h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)]"
          >
            {messages.common.cancel}
          </button>
          <button
            type="button"
            disabled={deleteAll.isPending}
            onClick={() => {
              deleteAll.mutate(undefined, {
                onSuccess: () => {
                  dispatch({ showDeleteAll: false, selected: null });
                },
              });
            }}
            className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-danger-border)] rounded-control text-sm font-medium text-[var(--ds-btn-danger-text)] hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] disabled:opacity-60"
          >
            <TrashIcon weight="duotone" className="w-3.5 h-3.5" />
            {deleteAll.isPending ? "..." : messages.common.delete}
          </button>
        </OverlayCard.Footer>
      </OverlayCard>
    </PageLayout>
  );
}
