import { TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Checkbox, FormLabel, FormOptional, MarkdownEditor, formInputClass } from "@lmaa/ui";

import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { usePersistedTextareaHeight } from "@/lib/hooks/usePersistedTextareaHeight.ts";

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

  usePersistedTextareaHeight("shop-delete-reason", "shops:textarea:delete-reason");

  return (
    <OverlayCard
      open
      onClose={onCancel}
      size={{ storageKey: "shops:delete-reason-card-size", defaultWidth: 512 }}
      aria-label={shopsMessages.deleteCard.title}
    >
      <OverlayCard.Header>
        <div className="flex items-center gap-3">
          <TrashIcon weight="duotone" className={dialogHeaderIconClass} />
          <h2 className="text-base font-semibold text-[var(--ds-text)]">
            {shopsMessages.deleteCard.title}
          </h2>
        </div>
        <p className="text-sm text-[var(--ds-text-muted)] mt-0.5">
          <span className="font-medium text-[var(--ds-text)]">{shopName}</span>{" "}
          {shopsMessages.deleteCard.markedDeletedHint}
        </p>
      </OverlayCard.Header>

      <OverlayCard.Body className="space-y-4">
        <div>
          <FormLabel htmlFor="shop-delete-reason">
            <span className="flex items-center gap-1.5">
              {shopsMessages.deleteCard.reason}{" "}
              <FormOptional>{shopsMessages.deleteCard.optional}</FormOptional>
            </span>
          </FormLabel>
          <MarkdownEditor
            id="shop-delete-reason"
            value={reason}
            onChange={setReason}
            rows={5}
            resizable
            placeholder={shopsMessages.deleteCard.reasonPlaceholder}
          />
        </div>

        <Checkbox
          checked={wasReported}
          onChange={setWasReported}
          label={shopsMessages.deleteCard.reportedLabel}
        />

        <div>
          <FormLabel htmlFor="shop-delete-mode">{shopsMessages.deleteCard.modeLabel}</FormLabel>
          <select
            id="shop-delete-mode"
            value={deleteMode}
            onChange={(event) => setDeleteMode(event.target.value as ShopDeleteMode)}
            className={formInputClass}
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
          className="py-1.5 px-4 border border-[var(--ds-btn-neutral-border)] rounded-control text-sm text-[var(--ds-btn-neutral-text)] hover:border-[var(--ds-btn-neutral-hover-border)] hover:bg-[var(--ds-btn-neutral-hover-bg)]"
        >
          {common.cancel}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(reason.trim(), wasReported, deleteMode)}
          disabled={isPending}
          className="py-1.5 px-4 bg-red-600 text-white rounded-control text-sm font-medium hover:bg-red-700 disabled:opacity-50"
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
