import {
  ArrowSquareOutIcon,
  DownloadSimpleIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  TrashIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";

import type { AffiliateScanResult, AffiliateScanStatus, AffiliateTrackingStatus } from "@lmaa/shared";

import { useI18n } from "@/context/I18nContext.tsx";
import {
  useAffiliateScanJob,
  useCancelBatchScan,
  useStartBatchScan,
} from "@/features/affiliate/hooks/useAffiliateScanJob.ts";
import {
  useAffiliateHealth,
  useAffiliateScans,
  useAffiliateStats,
  useDeleteAffiliateScan,
  useImportAffiliateScans,
  useUpdateAffiliateTracking,
} from "@/features/affiliate/hooks/useAffiliateScans.ts";

const STATUS_COLORS: Record<AffiliateScanStatus, string> = {
  direct: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  network: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  inquiry: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  none: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const TRACKING_COLORS: Record<AffiliateTrackingStatus, string> = {
  open: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  contacted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

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

export function AffiliateListPage() {
  const { messages } = useI18n();
  const t = messages.affiliate;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [trackingFilter, setTrackingFilter] = useState<string>("");
  const [selected, setSelected] = useState<AffiliateScanResult | null>(null);
  const [batchJobId, setBatchJobId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: scans = [], isLoading } = useAffiliateScans({
    status: statusFilter || undefined,
    tracking: trackingFilter || undefined,
    search: search || undefined,
  });
  const { data: stats } = useAffiliateStats();
  const { data: health } = useAffiliateHealth();
  const { data: job } = useAffiliateScanJob(batchJobId);

  const startBatch = useStartBatchScan();
  const cancelBatch = useCancelBatchScan();
  const updateTracking = useUpdateAffiliateTracking();
  const deleteScan = useDeleteAffiliateScan();
  const importScans = useImportAffiliateScans();

  const ollamaAvailable = health?.available ?? false;

  function handleStartBatchScan() {
    startBatch.mutate(undefined, {
      onSuccess: (newJob) => setBatchJobId(newJob.id),
    });
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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
    e.target.value = "";
  }

  async function handleExport() {
    try {
      const res = await fetch("/api/v1/admin/affiliate/export", { credentials: "include" });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `affiliate-scans-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // export failed
    }
  }

  const isJobActive = job?.status === "running" || job?.status === "pending";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--ds-border)] bg-[var(--ds-surface)]">
        <div className="p-4">
          <h1 className="text-lg font-semibold text-[var(--ds-text)]">{t.title}</h1>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="flex gap-4 px-4 pb-3">
            <div className="text-sm">
              <span className="text-[var(--ds-text-muted)]">{t.stats.total}:</span>{" "}
              <span className="font-medium">{stats.total}</span>
            </div>
            <div className="text-sm">
              <span className="text-[var(--ds-text-muted)]">{t.stats.withProgram}:</span>{" "}
              <span className="font-medium text-green-600">{stats.withProgram}</span>
            </div>
            <div className="text-sm">
              <span className="text-[var(--ds-text-muted)]">{t.stats.withoutProgram}:</span>{" "}
              <span className="font-medium text-gray-500">{stats.withoutProgram}</span>
            </div>
          </div>
        )}

        {/* Batch Progress */}
        {isJobActive && job && (
          <div className="flex items-center gap-3 px-4 pb-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-[var(--ds-text)]">{t.batch.running}</span>
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
              className="h-8 px-3 text-sm rounded-control border border-[var(--ds-border)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] hover:border-[var(--ds-border-strong)]"
            >
              {t.batch.cancel}
            </button>
          </div>
        )}

        {/* Ollama Warning */}
        {!ollamaAvailable && (
          <div className="px-4 pb-3">
            <p className="text-xs text-amber-600 dark:text-amber-400">{t.ollamaUnavailable}</p>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <div className="relative flex-1 min-w-48">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full h-9 pl-8 pr-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-sm"
          >
            <option value="">{t.filters.allStatus}</option>
            <option value="direct">{t.status.direct}</option>
            <option value="network">{t.status.network}</option>
            <option value="inquiry">{t.status.inquiry}</option>
            <option value="none">{t.status.none}</option>
          </select>
          <select
            value={trackingFilter}
            onChange={(e) => setTrackingFilter(e.target.value)}
            className="h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-sm"
          >
            <option value="">{t.filters.allTracking}</option>
            <option value="open">{t.tracking.open}</option>
            <option value="contacted">{t.tracking.contacted}</option>
            <option value="confirmed">{t.tracking.confirmed}</option>
            <option value="rejected">{t.tracking.rejected}</option>
          </select>
          <button
            type="button"
            onClick={handleStartBatchScan}
            disabled={!ollamaAvailable || isJobActive}
            className="h-9 px-3 flex items-center gap-1.5 rounded-control bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          >
            <PlayIcon weight="bold" className="w-3.5 h-3.5" />
            {t.scanAll}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-3 flex items-center gap-1.5 rounded-control border border-[var(--ds-border)] text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] hover:border-[var(--ds-border-strong)]"
          >
            <UploadSimpleIcon className="w-3.5 h-3.5" />
            {t.importLabel}
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button
            type="button"
            onClick={handleExport}
            className="h-9 px-3 flex items-center gap-1.5 rounded-control border border-[var(--ds-border)] text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] hover:border-[var(--ds-border-strong)]"
          >
            <DownloadSimpleIcon className="w-3.5 h-3.5" />
            {t.exportLabel}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
            </div>
          ) : scans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <p className="text-[var(--ds-text-muted)]">{t.noScans}</p>
              <p className="text-sm text-[var(--ds-text-muted)] mt-1">{t.noScansHint}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--ds-surface)] border-b border-[var(--ds-border)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-[var(--ds-text-muted)]">{t.table.shop}</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--ds-text-muted)]">{t.table.status}</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--ds-text-muted)]">{t.table.network}</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--ds-text-muted)]">{t.table.commission}</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--ds-text-muted)]">{t.table.tracking}</th>
                  <th className="text-right px-4 py-2 font-medium text-[var(--ds-text-muted)]">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr
                    key={scan.id}
                    onClick={() => setSelected(scan)}
                    className={`border-b border-[var(--ds-border)] cursor-pointer hover:bg-[var(--ds-surface-hover)] transition-colors ${selected?.id === scan.id ? "bg-[var(--ds-surface-hover)]" : ""}`}
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteScan.mutate(scan.shopId, {
                              onSuccess: () => {
                                if (selected?.id === scan.id) setSelected(null);
                              },
                            });
                          }}
                          className="h-8 w-8 flex items-center justify-center rounded-control text-[var(--ds-text-muted)] hover:text-[var(--ds-btn-danger-text)] hover:bg-[var(--ds-btn-danger-bg)]"
                          title={messages.common.delete}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-80 shrink-0 border-l border-[var(--ds-border)] bg-[var(--ds-surface)] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-[var(--ds-border)]">
              <h2 className="font-semibold text-[var(--ds-text)] truncate">{selected.shopName}</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1 rounded text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {/* Tracking Editor */}
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

              {/* Detail Fields */}
              <DetailField label={t.detail.recommendation} value={selected.recommendation} />
              <DetailField label={t.detail.programUrl} value={selected.programUrl} isLink />
              <DetailField label={t.detail.applicationUrl} value={selected.applicationUrl} isLink />
              <DetailField label={t.detail.contactEmail} value={selected.contactEmail} />
              <DetailField label={t.detail.compensationModel} value={selected.compensationModel} />
              <DetailField label={t.detail.cookieDuration} value={selected.cookieDuration} />
              <DetailField label={t.detail.payoutThreshold} value={selected.payoutThreshold} />
              <DetailField label={t.detail.requirements} value={selected.requirements} />
              <DetailField label={t.detail.notes} value={selected.notes} />
            </div>
          </div>
        )}
      </div>
    </div>
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
