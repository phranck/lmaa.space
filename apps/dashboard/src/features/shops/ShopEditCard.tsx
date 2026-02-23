import { useAdminCategories } from "@/features/categories/hooks/useAdminCategories.ts";
import {
  useAdminShop,
  useFetchPreviewImage,
  useRefetchShopImage,
  useSaveShop,
} from "@/features/shops/hooks/useAdminShops.ts";
import { useEditSubmission } from "@/features/submissions/hooks/useAdminSubmissions.ts";
import { EMPTY_SHOP_FORM_VALUE, ShopEditForm } from "@lmaa/ui";
import type { ShopEditFormValue } from "@lmaa/ui";
import { useEffect, useState } from "react";
import { SFArrowClockwise, SFXmark } from "sf-symbols-lib/monochrome";

type ShopEditCardProps = {
  initialData?: Partial<ShopEditFormValue>;
  onClose: () => void;
  onSaved: () => void;
} & ({ shopId: number | "new"; submissionId?: never } | { submissionId: number; shopId?: never });

export function ShopEditCard({
  shopId,
  submissionId,
  initialData,
  onClose,
  onSaved,
}: ShopEditCardProps) {
  const isSubmissionMode = submissionId !== undefined;
  const isNew = shopId === "new";
  const [closing, setClosing] = useState(false);
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
      });
    }
  }, [shopData]);

  useEffect(() => {
    if (!shopData) setForm({ ...EMPTY_SHOP_FORM_VALUE, ...initialData });
  }, [initialData, shopData]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setClosing(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const canSave = form.name.trim() !== "" && form.url.trim() !== "" && !isPending;

  function handleSave() {
    if (isSubmissionMode) {
      submissionMutation.mutate({ id: submissionId, data: form }, { onSuccess: onSaved });
    } else {
      shopMutation.mutate(form, { onSuccess: onSaved });
    }
  }

  const title = isSubmissionMode
    ? "Vorschlag bearbeiten"
    : isNew
      ? "Neuer Shop"
      : "Shop bearbeiten";

  return (
    <div
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4 ${closing ? "overlay-backdrop-exit" : "overlay-backdrop-enter"}`}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative bg-[var(--ds-surface)] rounded-[var(--radius-card)] shadow-2xl w-full max-w-lg overflow-hidden ${closing ? "overlay-card-exit" : "overlay-card-enter"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--ds-border-subtle)]">
          <h2 className="text-base font-semibold text-[var(--ds-text)]">{title}</h2>
          <button
            type="button"
            onClick={() => setClosing(true)}
            className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)] hover:bg-[var(--ds-bg-elevated)] transition-colors"
          >
            <SFXmark className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 max-h-[calc(100vh-14rem)] overflow-y-auto">
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
              variant="dashboard"
            />
          )}

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
                <div className="mt-4 pt-4 border-t border-[var(--ds-border-subtle)] flex items-center gap-3">
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
                      Vorschaubild
                    </p>
                    <p className="text-xs text-[var(--ds-text-subtle)] truncate">
                      {displayImage ?? "Kein Bild gesetzt"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshImage}
                    disabled={isPending || isLoadingShop}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-[var(--ds-border)] rounded-control text-xs text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors disabled:opacity-40"
                  >
                    <SFArrowClockwise className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} />
                    Neu laden
                  </button>
                </div>
              );
            })()}

          {isError && (
            <p className="text-red-500 text-sm mt-4">
              {error instanceof Error ? error.message : "Fehler beim Speichern."}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--ds-border-subtle)]">
          <button
            type="button"
            onClick={() => setClosing(true)}
            className="px-4 py-2 border border-[var(--ds-border)] text-[var(--ds-text-muted)] rounded-control text-sm hover:border-[var(--ds-border-strong)] transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 bg-[var(--ds-btn-primary-bg)] text-white rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] transition-colors disabled:opacity-40"
          >
            {isPending ? "Wird gespeichert…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
