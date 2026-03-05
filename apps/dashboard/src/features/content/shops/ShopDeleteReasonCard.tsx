import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { usePersistedTextareaHeight } from "@/lib/usePersistedTextareaHeight.ts";
import { Checkbox } from "@lmaa/ui";
import { useEffect, useRef, useState } from "react";
import { SiMarkdown } from "react-icons/si";

/**
 * Available delete strategies for shop removal flow.
 */
export type ShopDeleteMode = "mark_deleted" | "delete";

interface ShopDeleteReasonCardProps {
  shopName: string;
  wasReported?: boolean;
  isPending?: boolean;
  onConfirm: (reason: string, wasReported: boolean, mode: ShopDeleteMode) => void;
  onCancel: () => void;
}

/**
 * Dialog card requesting delete reason/mode before shop removal.
 *
 * @param props - Target shop name, defaults and action callbacks.
 * @returns Modal delete confirmation card.
 */
export function ShopDeleteReasonCard({
  shopName,
  wasReported: initialWasReported = false,
  isPending = false,
  onConfirm,
  onCancel,
}: ShopDeleteReasonCardProps) {
  const { messages } = useI18n();
  const common = messages.common;
  const shopsMessages = messages.shops;
  const [reason, setReason] = useState("");
  const [wasReported, setWasReported] = useState(initialWasReported);
  const [deleteMode, setDeleteMode] = useState<ShopDeleteMode>("mark_deleted");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  usePersistedTextareaHeight("shop-delete-reason", "shops:textarea:delete-reason");

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <OverlayCard
      open
      onClose={onCancel}
      size={{ storageKey: "shops:delete-reason-card-size", defaultWidth: 512 }}
      aria-label={shopsMessages.deleteCard.title}
    >
      <OverlayCard.Header>
        <h2 className="text-base font-semibold text-[var(--ds-text)]">
          {shopsMessages.deleteCard.title}
        </h2>
        <p className="text-sm text-[var(--ds-text-muted)] mt-0.5">
          <span className="font-medium text-[var(--ds-text)]">{shopName}</span>{" "}
          {shopsMessages.deleteCard.markedDeletedHint}
        </p>
      </OverlayCard.Header>

      <OverlayCard.Body className="space-y-4">
        <div>
          <label
            htmlFor="shop-delete-reason"
            className="block text-xs font-medium text-[var(--ds-text-muted)] mb-1"
          >
            <span className="flex items-center gap-1.5">
              {shopsMessages.deleteCard.reason}{" "}
              <span className="text-[var(--ds-text-subtle)] font-normal">
                {shopsMessages.deleteCard.optional}
              </span>
              <SiMarkdown
                className="w-5 h-5 opacity-40"
                title={shopsMessages.deleteCard.markdownSupported}
              />
            </span>
          </label>
          <textarea
            id="shop-delete-reason"
            ref={textareaRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            placeholder={shopsMessages.deleteCard.reasonPlaceholder}
            className="w-full rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-[var(--ds-text-subtle)]"
          />
        </div>

        <Checkbox
          checked={wasReported}
          onChange={setWasReported}
          label={shopsMessages.deleteCard.reportedLabel}
        />

        <div>
          <label
            htmlFor="shop-delete-mode"
            className="block text-xs font-medium text-[var(--ds-text-muted)] mb-1"
          >
            {shopsMessages.deleteCard.modeLabel}
          </label>
          <select
            id="shop-delete-mode"
            value={deleteMode}
            onChange={(event) => setDeleteMode(event.target.value as ShopDeleteMode)}
            className="w-full h-9 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] px-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="mark_deleted">{shopsMessages.deleteCard.markDeleted}</option>
            <option value="delete">{shopsMessages.deleteCard.deletePermanently}</option>
          </select>
        </div>
      </OverlayCard.Body>

      <OverlayCard.Footer className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="h-9 px-4 border border-[var(--ds-btn-neutral-border)] rounded-control text-sm text-[var(--ds-btn-neutral-text)] hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
        >
          {common.cancel}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(reason.trim(), wasReported, deleteMode)}
          disabled={isPending}
          className="h-9 px-4 bg-red-600 text-white rounded-control text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isPending
            ? shopsMessages.deleteCard.deleting
            : deleteMode === "delete"
              ? shopsMessages.deleteCard.deletePermanently
              : shopsMessages.deleteCard.markDeleted}
        </button>
      </OverlayCard.Footer>
    </OverlayCard>
  );
}
