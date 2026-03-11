import {
  ArrowCounterClockwiseIcon,
  DownloadIcon,
  FileTextIcon,
  InfoIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";

import { EditorPageShell } from "@/components/ui/EditorPageShell.tsx";
import { EditorToolbarButton } from "@/components/ui/EditorToolbarButton.tsx";
import { SaveNotification } from "@/components/ui/SaveNotification.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useDeleteShop, useSetShopVisibility } from "@/features/content/hooks/useAdminShops.ts";
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
  const isRejected = shopVisibility === "rejected";
  const showRestore =
    shopVisibility === "onhold" || shopVisibility === "deleted" || shopVisibility === "rejected";
  const showPutOnHold = shopVisibility === "public";
  const showReject = controller.canReject && !isRejected;
  const showEditRejection = isRejected;
  const showRejectionInfo = isRejected;
  const showDelete = !controller.isNew;
  const backLabel = messages.layout.sidebar.shops;
  const rejectionToken = controller.activeShop?.rejectionToken ?? null;

  const saveLabel = controller.common.save;

  const isActionPending =
    controller.isPending || visibilityMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <EditorPageShell
        title={controller.title}
        backLabel={backLabel}
        onBack={() => navigate("/shops")}
        headerContent={
          <div className="flex items-center gap-3">
            <SaveNotification phase={controller.savedPhase} label={controller.common.saved} />
          </div>
        }
        toolbar={
          <div className="flex items-center gap-2">
            {showRestore && controller.activeShop && (
              <EditorToolbarButton
                onClick={() =>
                  visibilityMutation.mutate({
                    id: controller.activeShop!.id,
                    visibility: "public",
                  })
                }
                disabled={isActionPending}
                variant="success"
                icon={<ArrowCounterClockwiseIcon weight="duotone" className="h-3.5 w-3.5" />}
              >
                {controller.shopsMessages.table.restore}
              </EditorToolbarButton>
            )}

            {showPutOnHold && controller.activeShop && (
              <EditorToolbarButton
                onClick={() =>
                  visibilityMutation.mutate({
                    id: controller.activeShop!.id,
                    visibility: "onhold",
                  })
                }
                disabled={isActionPending}
                variant="warning"
              >
                {controller.shopsMessages.table.putOnHold}
              </EditorToolbarButton>
            )}

            {showReject && (
              <EditorToolbarButton
                onClick={() => controller.handleOpenRejectCard(false)}
                disabled={isActionPending}
                variant="danger"
                icon={<XCircleIcon weight="duotone" className="h-3.5 w-3.5" />}
              >
                {controller.shopsMessages.editCard.rejectSubmit}
              </EditorToolbarButton>
            )}

            {showEditRejection && (
              <>
                <EditorToolbarButton
                  onClick={() => controller.handleOpenRejectCard(true)}
                  disabled={isActionPending}
                  variant="neutral"
                  icon={<FileTextIcon weight="duotone" className="h-3.5 w-3.5" />}
                >
                  {messages.submissions.suggestions.editRejectionInfo}
                </EditorToolbarButton>

                {showRejectionInfo && (
                  <EditorToolbarButton
                    onClick={() => {
                      if (!rejectionToken) {
                        return;
                      }
                      window.open(
                        `${import.meta.env.VITE_FRONTEND_URL ?? (import.meta.env.DEV ? "http://localhost:4321" : "https://lmaa.space")}/rejected/${rejectionToken}`,
                        "_blank",
                      );
                    }}
                    disabled={isActionPending || !rejectionToken}
                    variant="warning"
                    icon={<InfoIcon weight="duotone" className="h-3.5 w-3.5" />}
                  >
                    {messages.submissions.suggestions.info}
                  </EditorToolbarButton>
                )}
              </>
            )}

            {showDelete && (
              <EditorToolbarButton
                onClick={() => setShowDeleteDialog(true)}
                disabled={isActionPending}
                variant="danger"
                icon={<TrashIcon weight="duotone" className="h-3.5 w-3.5" />}
              >
                {controller.shopsMessages.table.delete}
              </EditorToolbarButton>
            )}

            <EditorToolbarButton
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
              variant="primary"
              icon={<DownloadIcon weight="duotone" className="h-3.5 w-3.5" />}
            >
              {saveLabel}
            </EditorToolbarButton>
          </div>
        }
      >
        <ShopEditorFormContent controller={controller} />
      </EditorPageShell>

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
    </>
  );
}
