import { StorefrontIcon, XCircleIcon } from "@phosphor-icons/react";

import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { SaveNotification } from "@/components/ui/SaveNotification.tsx";

import type { ShopEditorModeProps } from "./shop-editor-types.ts";
import { ShopEditorFormContent } from "./ShopEditorFormContent.tsx";
import { ShopEditorRejectOverlay } from "./ShopEditorRejectOverlay.tsx";
import { useShopEditorController } from "./useShopEditorController.ts";

type ShopEditCardProps = ShopEditorModeProps & {
  onClose: () => void;
  onSaved: () => void;
};

export function ShopEditCard(props: ShopEditCardProps) {
  return "submissionId" in props && props.submissionId !== undefined ? (
    <SubmissionShopEditCard {...props} />
  ) : (
    <RegularShopEditCard {...props} />
  );
}

function RegularShopEditCard({
  shopId,
  initialData,
  initialOgImage,
  initialShop,
  onClose,
  onSaved,
}: Extract<ShopEditCardProps, { shopId: number | "new"; submissionId?: never }>) {
  const controller = useShopEditorController({
    shopId,
    initialData,
    initialOgImage,
    initialShop,
  });
  return <ShopEditCardLayout controller={controller} onClose={onClose} onSaved={onSaved} />;
}

function SubmissionShopEditCard({
  submissionId,
  initialData,
  initialOgImage,
  initialShop,
  onClose,
  onSaved,
}: Extract<ShopEditCardProps, { submissionId: number; shopId?: never }>) {
  const controller = useShopEditorController({
    submissionId,
    initialData,
    initialOgImage,
    initialShop,
  });
  return <ShopEditCardLayout controller={controller} onClose={onClose} onSaved={onSaved} />;
}

function ShopEditCardLayout({
  controller,
  onClose,
  onSaved,
}: {
  controller: ReturnType<typeof useShopEditorController>;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <OverlayCard
      open
      onClose={onClose}
      size={{ storageKey: "shops:edit-card-size", defaultWidth: 512 }}
      aria-label={controller.title}
    >
      <OverlayCard.Header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StorefrontIcon weight="duotone" className={dialogHeaderIconClass} />
          <h2 className="text-base font-semibold text-[var(--ds-text)]">{controller.title}</h2>
        </div>
        <SaveNotification phase={controller.savedPhase} label={controller.common.saved} />
      </OverlayCard.Header>

      <OverlayCard.Body>
        <ShopEditorFormContent controller={controller} />
      </OverlayCard.Body>

      <OverlayCard.Footer className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="py-1.5 px-4 border border-[var(--ds-border)] text-[var(--ds-text-muted)] rounded-control text-sm hover:border-[var(--ds-border-strong)] transition-colors"
        >
          {controller.common.cancel}
        </button>
        {controller.canReject && (
          <button
            type="button"
            onClick={() => controller.handleOpenRejectCard(false)}
            className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
          >
            <XCircleIcon weight="duotone" className="w-3.5 h-3.5" />
            {controller.shopsMessages.editCard.rejectSubmit}
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            void controller.handleSave({
              onSuccess: () => {
                onSaved();
              },
            })
          }
          disabled={!controller.canSave}
          className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors disabled:opacity-40"
        >
          {controller.isPending ? controller.common.saving : controller.common.save}
        </button>
      </OverlayCard.Footer>

      <ShopEditorRejectOverlay controller={controller} />
    </OverlayCard>
  );
}
