import {
  ArrowCounterClockwiseIcon,
  ArrowSquareOutIcon,
  FileTextIcon,
  HeartIcon,
  SealCheckIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";

import { encodeShopToken } from "@lmaa/shared";

import { SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { EditorPageShell } from "@/components/ui/EditorPageShell.tsx";
import { EditorPageTitleDetails } from "@/components/ui/EditorPageTitleDetails.tsx";
import { EditorToolbarButton } from "@/components/ui/EditorToolbarButton.tsx";
import { SaveNotification } from "@/components/ui/SaveNotification.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { ShopDeleteReasonCard } from "@/features/content/shops/ShopDeleteReasonCard.tsx";
import { FRONTEND_URL } from "@/lib/env.ts";

import { useAcceptShopReview, useDeleteShop, useSetShopVisibility } from "./hooks/useAdminShops.ts";
import { useShopEditorController } from "./hooks/useShopEditorController.ts";
import { ShopEditorFormContent } from "./ShopEditorFormContent.tsx";
import { ShopEditorRejectOverlay } from "./ShopEditorRejectOverlay.tsx";

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
  const { locale, messages } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const visibilityMutation = useSetShopVisibility();
  const deleteMutation = useDeleteShop();
  const acceptReviewMutation = useAcceptShopReview();

  const controller = useShopEditorController({ shopId });

  const shopVisibility = controller.activeShop?.visibility;
  const isRejected = shopVisibility === "rejected";
  const showRestore =
    shopVisibility === "onhold" || shopVisibility === "deleted" || shopVisibility === "rejected";
  const showPutOnHold = shopVisibility === "public";
  const showReject = controller.canReject && !isRejected;
  const showEditRejection = isRejected;
  const showDelete = !controller.isNew;
  const showAcceptReview = !controller.isNew && controller.activeShop?.needsReview === true;
  const backLabel = messages.layout.sidebar.shops;
  const returnTo =
    typeof location.state === "object" &&
    location.state !== null &&
    "returnTo" in location.state &&
    typeof location.state.returnTo === "string"
      ? location.state.returnTo
      : "/shops";

  const saveLabel = controller.common.save;
  const activeShop = controller.activeShop;
  const shopHeaderTitle = controller.isNew
    ? controller.title
    : activeShop?.name || controller.name.trim() || controller.title;
  const shopPublishedAt =
    !controller.isNew && activeShop && "createdAt" in activeShop && activeShop.createdAt
      ? new Date(activeShop.createdAt).toLocaleString(locale, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;
  const shopHeaderSubtitle = shopPublishedAt
    ? `${controller.shopsMessages.editCard.publishedAt}: ${shopPublishedAt}`
    : null;
  const shopHeaderLikes =
    !controller.isNew && activeShop?.likeCount != null ? (
      <span className="inline-flex items-center gap-1 text-sm font-normal text-red-400">
        <HeartIcon weight="duotone" className="size-4" />
        {activeShop.likeCount}
      </span>
    ) : null;

  const isActionPending =
    controller.isPending ||
    visibilityMutation.isPending ||
    deleteMutation.isPending ||
    acceptReviewMutation.isPending;
  const shopDetailUrl =
    !controller.isNew && activeShop?.visibility === "public" && typeof activeShop.id === "number"
      ? `${FRONTEND_URL}/shop/${encodeShopToken(activeShop.id)}`
      : null;

  return (
    <>
      <EditorPageShell
        title={shopHeaderTitle}
        titleContent={
          controller.isNew ? undefined : (
            <EditorPageTitleDetails
              title={shopHeaderTitle}
              subtitle={shopHeaderSubtitle}
              trailing={shopHeaderLikes}
            />
          )
        }
        backLabel={backLabel}
        onBack={() => navigate(returnTo)}
        headerContent={
          <div className="flex items-center gap-3">
            <SaveNotification phase={controller.savedPhase} label={controller.common.saved} />
            {shopDetailUrl ? (
              <DashboardButton
                onClick={() => window.open(shopDetailUrl, "_blank", "noopener,noreferrer")}
                disabled={isActionPending}
                leadingIcon={<ArrowSquareOutIcon weight="duotone" className="size-3.5" />}
                variant="success"
              >
                {controller.shopsMessages.editCard.openDetailPage}
              </DashboardButton>
            ) : null}
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
                icon={<ArrowCounterClockwiseIcon weight="duotone" className="size-3.5" />}
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
                icon={<XCircleIcon weight="duotone" className="size-3.5" />}
              >
                {controller.shopsMessages.editCard.rejectSubmit}
              </EditorToolbarButton>
            )}

            {showEditRejection && (
              <EditorToolbarButton
                onClick={() => controller.handleOpenRejectCard(true)}
                disabled={isActionPending}
                variant="neutral"
                icon={<FileTextIcon weight="duotone" className="size-3.5" />}
              >
                {messages.submissions.suggestions.editRejectionInfo}
              </EditorToolbarButton>
            )}

            {showDelete && (
              <EditorToolbarButton
                onClick={() => setShowDeleteDialog(true)}
                disabled={isActionPending}
                variant="danger"
                icon={<TrashIcon weight="duotone" className="size-3.5" />}
              >
                {controller.shopsMessages.table.delete}
              </EditorToolbarButton>
            )}

            {showAcceptReview && (
              <EditorToolbarButton
                onClick={() =>
                  acceptReviewMutation.mutate(controller.activeShop!.id, {
                    onSuccess: () => navigate(returnTo),
                  })
                }
                disabled={isActionPending}
                variant="review"
                icon={<SealCheckIcon weight="duotone" className="size-3.5" />}
              >
                {controller.shopsMessages.editCard.acceptReview}
              </EditorToolbarButton>
            )}

            <SaveActionButton
              onClick={() =>
                void controller.handleSaveSafely({
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
              label={saveLabel}
              keyboardShortcut={!controller.rejectStateIsOpen}
            />
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
                  navigate(returnTo);
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
