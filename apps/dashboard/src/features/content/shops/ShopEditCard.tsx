import { StorefrontIcon } from "@phosphor-icons/react";

import {
  CancelActionButton,
  RejectActionButton,
  SaveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { SaveNotification } from "@/components/ui/SaveNotification.tsx";

import { useShopEditorController } from "./hooks/useShopEditorController.ts";
import type { ShopEditorModeProps } from "./shop-editor-types.ts";
import { ShopEditorFormContent } from "./ShopEditorFormContent.tsx";
import { ShopEditorRejectOverlay } from "./ShopEditorRejectOverlay.tsx";

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
        <CancelActionButton
          onClick={onClose}
          label={controller.common.cancel}
        />
        {controller.canReject && (
          <RejectActionButton
            onClick={() => controller.handleOpenRejectCard(false)}
            label={controller.shopsMessages.editCard.rejectSubmit}
          />
        )}
        <SaveActionButton
          onClick={() =>
            void controller.handleSave({
              onSuccess: () => {
                onSaved();
              },
            })
          }
          disabled={!controller.canSave}
          busy={controller.isPending}
          label={controller.isPending ? controller.common.saving : controller.common.save}
        />
      </OverlayCard.Footer>

      <ShopEditorRejectOverlay controller={controller} />
    </OverlayCard>
  );
}
