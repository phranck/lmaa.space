import { useAdminCategories } from "@/features/categories/hooks/useAdminCategories.ts";
import { useSaveShop } from "@/features/shops/hooks/useAdminShops.ts";
import { useEditSubmission } from "@/features/submissions/hooks/useAdminSubmissions.ts";
import { EMPTY_SHOP_FORM_VALUE, ShopEditForm } from "@lmaa/ui";
import type { ShopEditFormValue } from "@lmaa/ui";
import { useEffect, useState } from "react";
import { LuX } from "react-icons/lu";

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

  const { data: categories = [] } = useAdminCategories();
  const shopMutation = useSaveShop(isSubmissionMode ? null : isNew ? null : (shopId as number));
  const submissionMutation = useEditSubmission();

  const isPending = shopMutation.isPending || submissionMutation.isPending;
  const isError = shopMutation.isError || submissionMutation.isError;
  const error = shopMutation.error ?? submissionMutation.error;

  useEffect(() => {
    setForm({ ...EMPTY_SHOP_FORM_VALUE, ...initialData });
  }, [initialData]);

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
        className={`relative bg-white rounded-[var(--radius-card)] shadow-2xl w-full max-w-lg overflow-hidden ${closing ? "overlay-card-exit" : "overlay-card-enter"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={() => setClosing(true)}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <LuX size={15} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 max-h-[calc(100vh-14rem)] overflow-y-auto">
          <ShopEditForm
            value={form}
            onChange={setForm}
            categories={categories}
            variant="dashboard"
          />

          {isError && (
            <p className="text-red-500 text-sm mt-4">
              {error instanceof Error ? error.message : "Fehler beim Speichern."}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setClosing(true)}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-control text-sm hover:border-gray-300 transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-control text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isPending ? "Wird gespeichert…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
