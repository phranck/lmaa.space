import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { SaveNotification, useSaveNotification } from "@/components/ui/SaveNotification.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAdminCategories } from "@/features/content/hooks/useAdminCategories.ts";
import {
  useAdminShop,
  useFetchPreviewImage,
  useRefetchShopImage,
  useSaveShop,
} from "@/features/content/hooks/useAdminShops.ts";
import { getShopEditFormI18n } from "@/features/content/shops/shop-form-i18n.ts";
import { useEditSubmission } from "@/features/overview/hooks/useSubmissions.ts";
import { useKeyboardSave } from "@/lib/useKeyboardSave.ts";
import { usePersistedTextareaHeight } from "@/lib/usePersistedTextareaHeight.ts";
import { EMPTY_SHOP_FORM_VALUE, ShopEditForm } from "@lmaa/ui";
import type { ShopEditFormValue } from "@lmaa/ui";
import { useEffect, useState } from "react";
import { SFArrowClockwise, SFSquareAndArrowDownFill } from "sf-symbols-lib/monochrome";

type ShopEditCardProps = {
  initialData?: Partial<ShopEditFormValue>;
  onClose: () => void;
  onSaved: () => void;
} & ({ shopId: number | "new"; submissionId?: never } | { submissionId: number; shopId?: never });

/**
 * Drawer-like editor for creating/updating shops.
 *
 * @param props - Edit target id and close/save callbacks.
 * @returns Shop edit form card.
 */
export function ShopEditCard({
  shopId,
  submissionId,
  initialData,
  onClose,
  onSaved,
}: ShopEditCardProps) {
  const { locale, messages } = useI18n();
  const common = messages.common;
  const shopsMessages = messages.shops;
  const shopFormI18n = getShopEditFormI18n(locale);
  const isSubmissionMode = submissionId !== undefined;
  const isNew = shopId === "new";
  const { phase: savedPhase, show: showSaved } = useSaveNotification();
  const [form, setForm] = useState<ShopEditFormValue>({ ...EMPTY_SHOP_FORM_VALUE, ...initialData });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: categories = [] } = useAdminCategories();
  const { data: shopData, isLoading: isLoadingShop } = useAdminShop(
    typeof shopId === "number" ? shopId : null,
  );
  const shopMutation = useSaveShop(isSubmissionMode ? null : isNew ? null : (shopId as number));
  const submissionMutation = useEditSubmission();
  const refetchImageMutation = useRefetchShopImage(typeof shopId === "number" ? shopId : 0);
  const fetchPreviewMutation = useFetchPreviewImage();

  const isPending = shopMutation.isPending || submissionMutation.isPending;
  const isError = shopMutation.isError || submissionMutation.isError;
  const error = shopMutation.error ?? submissionMutation.error;

  useEffect(() => {
    if (shopData) {
      setForm({
        ...EMPTY_SHOP_FORM_VALUE,
        name: shopData.name,
        url: shopData.url,
        description: shopData.description ?? "",
        categoryIds: shopData.categories.map((c) => c.id),
        region: shopData.region ?? [],
        shipping: shopData.shipping ?? "",
        contactEmail: shopData.contactEmail ?? "",
        socialMedia: shopData.socialMedia ?? {},
      });
    }
  }, [shopData]);

  useEffect(() => {
    if (!shopData) setForm({ ...EMPTY_SHOP_FORM_VALUE, ...initialData });
  }, [initialData, shopData]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only fetch for submission preview image
  useEffect(() => {
    if (isSubmissionMode && form.url) {
      fetchPreviewMutation.mutate(form.url, {
        onSuccess: (data) => setPreviewImage(data.ogImage),
      });
    }
  }, [isSubmissionMode]);

  usePersistedTextareaHeight("sef-description", "shops:textarea:description", !isLoadingShop);

  const canSave = form.name.trim() !== "" && form.url.trim() !== "" && !isPending;

  function handleSave(close = true) {
    const onSuccess = close ? onSaved : showSaved;
    if (isSubmissionMode) {
      submissionMutation.mutate({ id: submissionId, data: form }, { onSuccess });
    } else {
      shopMutation.mutate(form, { onSuccess });
    }
  }

  useKeyboardSave(() => {
    if (canSave) handleSave(false);
  });

  const title = isSubmissionMode
    ? shopsMessages.editCard.titleSubmissionEdit
    : isNew
      ? shopsMessages.editCard.titleNew
      : shopsMessages.editCard.titleEdit;

  return (
    <OverlayCard
      open
      onClose={onClose}
      size={{ storageKey: "shops:edit-card-size", defaultWidth: 512 }}
      aria-label={title}
    >
      <OverlayCard.Header className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--ds-text)]">{title}</h2>
        <SaveNotification phase={savedPhase} label={common.saved} />
      </OverlayCard.Header>

      <OverlayCard.Body>
        {!isNew &&
          (() => {
            const displayImage = isSubmissionMode ? previewImage : (shopData?.ogImage ?? null);
            const isPending = isSubmissionMode
              ? fetchPreviewMutation.isPending
              : refetchImageMutation.isPending;

            function handleRefreshImage() {
              if (isSubmissionMode) {
                fetchPreviewMutation.mutate(form.url, {
                  onSuccess: (data) => setPreviewImage(data.ogImage),
                });
              } else {
                refetchImageMutation.mutate();
              }
            }

            return (
              <div className="mb-4 pb-4 border-b border-[var(--ds-border-subtle)] flex items-center gap-3">
                <div className="shrink-0 w-14 h-14 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-alt)] overflow-hidden flex items-center justify-center">
                  {displayImage ? (
                    <img src={displayImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-[var(--ds-text-subtle)] select-none">
                      {form.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--ds-text-muted)] mb-0.5">
                    {shopsMessages.editCard.previewImage}
                  </p>
                  <p className="text-xs text-[var(--ds-text-subtle)] truncate">
                    {displayImage ?? shopsMessages.editCard.noImage}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshImage}
                  disabled={isPending || isLoadingShop}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-[var(--ds-border)] rounded-control text-xs text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors disabled:opacity-40"
                >
                  <SFArrowClockwise className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} />
                  {shopsMessages.editCard.reloadImage}
                </button>
              </div>
            );
          })()}

        {isLoadingShop ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => `sk-${i}`).map((k) => (
              <div key={k} className="h-10 bg-[var(--ds-bg-elevated)] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <ShopEditForm
            value={form}
            onChange={setForm}
            categories={categories}
            regionOptions={shopFormI18n.regionOptions}
            messages={shopFormI18n.messages}
            variant="dashboard"
          />
        )}

        {isError && (
          <p className="text-red-500 text-sm mt-4">
            {error instanceof Error ? error.message : shopsMessages.editCard.errorSaving}
          </p>
        )}
      </OverlayCard.Body>

      <OverlayCard.Footer className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 border border-[var(--ds-border)] text-[var(--ds-text-muted)] rounded-control text-sm hover:border-[var(--ds-border-strong)] transition-colors"
        >
          {common.cancel}
        </button>
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={!canSave}
          className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors disabled:opacity-40"
        >
          <SFSquareAndArrowDownFill className="w-3.5 h-3.5" />
          {isPending ? common.saving : common.save}
        </button>
      </OverlayCard.Footer>
    </OverlayCard>
  );
}
