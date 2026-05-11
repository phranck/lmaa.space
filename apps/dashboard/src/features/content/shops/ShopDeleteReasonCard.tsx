import { TrashIcon } from "@phosphor-icons/react";
import { Suspense, lazy, useState } from "react";

import { FormLabel, FormOptional } from "@lmaa/ui/form-primitives";

const MarkdownEditor = lazy(() =>
  import("@lmaa/ui/markdown-editor").then((m) => ({ default: m.MarkdownEditor })),
);

import { CancelActionButton, DeleteActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardCheckboxField, DashboardCombobox } from "@/components/ui/DashboardControls.tsx";
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
          <Suspense
            fallback={
              <div className="h-[7.5rem] rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] animate-pulse" />
            }
          >
            <MarkdownEditor
              id="shop-delete-reason"
              value={reason}
              onChange={setReason}
              rows={5}
              resizable
              placeholder={shopsMessages.deleteCard.reasonPlaceholder}
            />
          </Suspense>
        </div>

        <DashboardCheckboxField
          checked={wasReported}
          onCheckedChange={setWasReported}
          label={shopsMessages.deleteCard.reportedLabel}
          className="items-center"
          boxClassName="mt-0"
        />

        <div>
          <FormLabel htmlFor="shop-delete-mode">{shopsMessages.deleteCard.modeLabel}</FormLabel>
          <DashboardCombobox
            id="shop-delete-mode"
            value={deleteMode}
            onValueChange={(value) => setDeleteMode(value as ShopDeleteMode)}
            options={[
              {
                value: "mark_deleted",
                label: shopsMessages.deleteCard.markDeleted,
              },
              {
                value: "delete",
                label: shopsMessages.deleteCard.deletePermanently,
              },
            ]}
          />
        </div>
      </OverlayCard.Body>

      <OverlayCard.Footer className="flex justify-end gap-2">
        <CancelActionButton onClick={onCancel} disabled={isPending} label={common.cancel} />
        <DeleteActionButton
          onClick={() => onConfirm(reason.trim(), wasReported, deleteMode)}
          disabled={isPending}
          label={
            isPending
              ? shopsMessages.deleteCard.deleting
              : deleteMode === "delete"
                ? shopsMessages.deleteCard.deletePermanently
                : shopsMessages.deleteCard.markDeleted
          }
        />
      </OverlayCard.Footer>
    </OverlayCard>
  );
}
