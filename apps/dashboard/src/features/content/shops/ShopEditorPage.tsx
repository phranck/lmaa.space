import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import SFArrowCounterclockwise from "sf-symbols-lib/monochrome/SFArrowCounterclockwise";
import SFSquareAndArrowDownFill from "sf-symbols-lib/monochrome/SFSquareAndArrowDownFill";
import SFTrashFill from "sf-symbols-lib/monochrome/SFTrashFill";
import SFXmarkCircleFill from "sf-symbols-lib/monochrome/SFXmarkCircleFill";

import { Card } from "@/components/ui/Card.tsx";
import { HeaderBackButton } from "@/components/ui/HeaderBackButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { SaveNotification } from "@/components/ui/SaveNotification.tsx";
import { Toolbar } from "@/components/ui/Toolbar.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useDeleteShop,
  useSetShopVisibility,
} from "@/features/content/hooks/useAdminShops.ts";
import { ShopDeleteReasonCard } from "@/features/content/shops/ShopDeleteReasonCard.tsx";

import {
  ShopEditorFormContent,
  ShopEditorRejectOverlay,
  useShopEditorController,
} from "./ShopEditorShared.tsx";

function resolveShopEditorRoute(shopIdParam: string | undefined) {
  if (shopIdParam === "new") {
    return { shopId: "new" as const, invalid: false };
  }

  const parsed = Number(shopIdParam);
  if (!shopIdParam || Number.isNaN(parsed) || parsed <= 0) {
    return { shopId: null, invalid: true };
  }

  return { shopId: parsed, invalid: false };
}

export function ShopEditorPage() {
  const { shopId: shopIdParam } = useParams();
  const { shopId, invalid } = resolveShopEditorRoute(shopIdParam);

  if (invalid || shopId === null) {
    return <Navigate to="/shops" replace />;
  }

  return <ResolvedShopEditorPage shopId={shopId} />;
}

function ResolvedShopEditorPage({ shopId }: { shopId: number | "new" }) {
  const { messages } = useI18n();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const visibilityMutation = useSetShopVisibility();
  const deleteMutation = useDeleteShop();

  const controller = useShopEditorController({ shopId });

  const shopVisibility = controller.activeShop?.visibility;
  const showRestore =
    shopVisibility === "onhold" || shopVisibility === "rejected" || shopVisibility === "deleted";
  const showPutOnHold = shopVisibility === "public";
  const showReject = controller.canReject;
  const showDelete = !controller.isNew;
  const backLabel = messages.layout.sidebar.shops;

  const saveLabel = controller.isPending ? controller.common.saving : controller.common.save;

  const isActionPending =
    controller.isPending || visibilityMutation.isPending || deleteMutation.isPending;

  return (
    <PageLayout>
      <PageHeader
        title={controller.title}
        leading={<HeaderBackButton label={backLabel} onClick={() => navigate("/shops")} />}
      >
        <div className="flex items-center gap-3">
          <SaveNotification phase={controller.savedPhase} label={controller.common.saved} />
        </div>
      </PageHeader>

      <PageBody className="min-h-0 overflow-y-auto mb-3">
        <Card className="flex-1 min-h-0 p-5 overflow-y-auto">
          <ShopEditorFormContent controller={controller} />
        </Card>
      </PageBody>

      <Toolbar className="justify-end">
        <div className="flex items-center gap-2">
          {showRestore && controller.activeShop && (
            <button
              type="button"
              onClick={() =>
                visibilityMutation.mutate({
                  id: controller.activeShop!.id,
                  visibility: "public",
                })
              }
              disabled={isActionPending}
              className="flex items-center gap-2 h-8 px-4 border border-[var(--ds-btn-success-border)] text-[var(--ds-btn-success-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-success-hover-border)] hover:bg-[var(--ds-btn-success-hover-bg)] disabled:opacity-60 transition-colors"
            >
              <SFArrowCounterclockwise className="w-3.5 h-3.5" />
              {controller.shopsMessages.table.restore}
            </button>
          )}

          {showPutOnHold && controller.activeShop && (
            <button
              type="button"
              onClick={() =>
                visibilityMutation.mutate({
                  id: controller.activeShop!.id,
                  visibility: "onhold",
                })
              }
              disabled={isActionPending}
              className="h-8 px-4 border border-[var(--ds-btn-warning-border)] text-[var(--ds-btn-warning-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-warning-hover-border)] hover:bg-[var(--ds-btn-warning-hover-bg)] disabled:opacity-60 transition-colors"
            >
              {controller.shopsMessages.table.putOnHold}
            </button>
          )}

          {showReject && (
            <button
              type="button"
              onClick={controller.handleOpenRejectCard}
              disabled={isActionPending}
              className="flex items-center gap-2 h-8 px-4 border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] disabled:opacity-60 transition-colors"
            >
              <SFXmarkCircleFill className="w-3.5 h-3.5" />
              {controller.shopsMessages.editCard.rejectSubmit}
            </button>
          )}

          {showDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isActionPending}
              className="flex items-center gap-2 h-8 px-4 border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] disabled:opacity-60 transition-colors"
            >
              <SFTrashFill className="w-3.5 h-3.5" />
              {controller.shopsMessages.table.delete}
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              void controller.handleSave({
                onSuccess: (saved) => {
                  if (controller.isNew) {
                    const savedShopId = controller.getSavedShopId(saved);
                    if (savedShopId !== null) {
                      navigate(`/shops/${savedShopId}`, { replace: true });
                    }
                  } else {
                    controller.showSaved();
                  }
                },
              })
            }
            disabled={!controller.canSave || isActionPending}
            className="flex items-center gap-2 h-8 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-60 transition-colors"
          >
            <SFSquareAndArrowDownFill className="w-3.5 h-3.5" />
            {saveLabel}
          </button>
        </div>
      </Toolbar>

      <ShopEditorRejectOverlay controller={controller} />

      {showDeleteDialog && controller.activeShop && (
        <ShopDeleteReasonCard
          shopName={controller.activeShop.name}
          wasReported={false}
          isPending={deleteMutation.isPending}
          onConfirm={(reason, wasReported, mode) => {
            deleteMutation.mutate(
              { id: controller.activeShop!.id, reason, wasReported, mode },
              {
                onSuccess: () => {
                  setShowDeleteDialog(false);
                  navigate("/shops");
                },
              },
            );
          }}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </PageLayout>
  );
}
