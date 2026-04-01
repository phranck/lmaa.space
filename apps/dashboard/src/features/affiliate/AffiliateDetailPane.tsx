import { ArrowSquareOutIcon, XCircleIcon } from "@phosphor-icons/react";

import type { AffiliateScanResult, AffiliateNetworkId, AffiliateTrackingStatus } from "@lmaa/shared";

import { useI18n } from "@/context/I18nContext.tsx";
import { SUPPORTED_NETWORKS } from "@/features/affiliate/affiliate-constants.ts";

// biome-ignore lint/suspicious/noExplicitAny: mutation type from TanStack Query
type TrackingMutation = { mutate: (...args: any[]) => void };

type AffiliateMessages = ReturnType<typeof useI18n>["messages"]["affiliate"];

function getNetworkId(networkName: string | null): AffiliateNetworkId | null {
  if (!networkName) return null;
  const lower = networkName.toLowerCase();
  if (lower === "awin") return "awin";
  if (lower === "tradedoubler") return "tradedoubler";
  if (lower === "adcell") return "adcell";
  return null;
}

function ApplyAtNetworkButton({ scan }: { scan: AffiliateScanResult }) {
  const { messages } = useI18n();
  const t = messages.affiliate.detail;

  const networkId = getNetworkId(scan.networkName);
  const applyUrl = scan.networkProgramUrl ?? scan.applicationUrl;

  if (!networkId || !SUPPORTED_NETWORKS.has(scan.networkName ?? "")) return null;

  return (
    <div className="space-y-2">
      {applyUrl && (
        <a
          href={applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-9 flex items-center justify-center gap-1.5 rounded-control border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)]"
        >
          <ArrowSquareOutIcon weight="duotone" className="w-3.5 h-3.5" />
          {t.applyAtNetwork}
        </a>
      )}
      {scan.networkProgramId && (
        <p className="text-xs text-[var(--ds-text-muted)]">
          {t.networkProgramId}: {scan.networkProgramId}
        </p>
      )}
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

interface AffiliateDetailPaneProps {
  selected: AffiliateScanResult;
  paneClosing: boolean;
  onAnimationEnd: () => void;
  onClose: () => void;
  onSelectedChange: (updated: AffiliateScanResult | null) => void;
  updateTracking: TrackingMutation;
  t: AffiliateMessages;
}

export function AffiliateDetailPane({
  selected,
  paneClosing,
  onAnimationEnd,
  onClose,
  onSelectedChange,
  updateTracking,
  t,
}: AffiliateDetailPaneProps) {
  return (
    <div
      onAnimationEnd={onAnimationEnd}
      className={`fixed top-14 right-0 bottom-0 w-80 z-20 border-l border-[var(--ds-border)] bg-[var(--ds-surface)] flex flex-col ${
        paneClosing ? "animate-[slideOut_200ms_ease-in-out_forwards]" : "animate-[slideIn_200ms_ease-in-out_forwards]"
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-[var(--ds-border)]">
        <h2 className="font-semibold text-[var(--ds-text)] truncate">{selected.shopName}</h2>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
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
                    onSelectedChange({ ...selected, trackingStatus: newStatus }),
                },
              );
            }}
            className="w-full h-9 mt-1 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-sm"
          >
            <option value="open">{t.tracking.open}</option>
            <option value="contacted">{t.tracking.contacted}</option>
            <option value="confirmed">{t.tracking.confirmed}</option>
            <option value="rejected">{t.tracking.rejected}</option>
            <option value="closed">{t.tracking.closed}</option>
          </select>
          <p className="text-xs text-[var(--ds-text-muted)] mt-1">
            {t.detail.lastUpdated}: {new Date(selected.updatedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <ApplyAtNetworkButton scan={selected} />
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-muted)]">
            {t.detail.trackingNote}
          </label>
          <textarea
            value={selected.trackingNote ?? ""}
            onChange={(e) => onSelectedChange({ ...selected, trackingNote: e.target.value })}
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
  );
}
