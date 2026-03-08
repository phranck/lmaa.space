import { useEffect, useReducer, useState } from "react";
import SFArrowClockwise from "sf-symbols-lib/monochrome/SFArrowClockwise";
import SFDocumentOnDocumentFill from "sf-symbols-lib/monochrome/SFDocumentOnDocumentFill";
import SFStorefrontFill from "sf-symbols-lib/monochrome/SFStorefrontFill";
import SFXmarkCircleFill from "sf-symbols-lib/monochrome/SFXmarkCircleFill";

import { generateRejectionToken, type AdminShopListItem, type Shop } from "@lmaa/shared";
import { EMPTY_SHOP_FORM_VALUE, FormLabelText, ShopEditForm } from "@lmaa/ui";
import type { ShopEditFormValue } from "@lmaa/ui";

import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { RejectDialog } from "@/components/ui/RejectDialog.tsx";
import { useSaveNotification } from "@/components/ui/SaveNotification.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAdminCategories } from "@/features/content/hooks/useAdminCategories.ts";
import {
  useAdminShop,
  usePreviewImage,
  useRefetchShopImage,
  useSaveShop,
  useSetShopOgImage,
  useSetShopVisibility,
} from "@/features/content/hooks/useAdminShops.ts";
import { useEditSubmission } from "@/features/overview/hooks/useSubmissions.ts";
import { useKeyboardSave } from "@/lib/useKeyboardSave.ts";
import { usePersistedTextareaHeight } from "@/lib/usePersistedTextareaHeight.ts";

import { getShopEditFormI18n } from "./shop-form-i18n.ts";

export type ShopEditorModeProps = {
  initialData?: Partial<ShopEditFormValue>;
  initialOgImage?: string | null;
  initialShop?: AdminShopListItem;
} & ({ shopId: number | "new"; submissionId?: never } | { submissionId: number; shopId?: never });

type ShopImageState = {
  draftOgImageInput: string | null;
  previewOverride: string | null | undefined;
  previewRequestUrl: string | null;
};

type RejectState = {
  open: boolean;
  reason: string;
  longText: string;
  token: string | null;
};

function getInitialImageState(
  initialData: Partial<ShopEditFormValue> | undefined,
  initialOgImage: string | null | undefined,
  isSubmissionMode: boolean,
): ShopImageState {
  const trimmedInitialOgImage = initialOgImage?.trim() || null;

  return {
    draftOgImageInput: trimmedInitialOgImage,
    previewOverride: isSubmissionMode && trimmedInitialOgImage ? trimmedInitialOgImage : undefined,
    previewRequestUrl:
      isSubmissionMode && !trimmedInitialOgImage ? initialData?.url?.trim() || null : null,
  };
}

function getEmptyRejectState(): RejectState {
  return {
    open: false,
    reason: "",
    longText: "",
    token: null,
  };
}

function getInitialFormValue(
  initialData: Partial<ShopEditFormValue> | undefined,
  shopData?: Awaited<ReturnType<typeof useAdminShop>>["data"],
): ShopEditFormValue {
  if (!shopData) {
    return { ...EMPTY_SHOP_FORM_VALUE, ...initialData };
  }

  return {
    ...EMPTY_SHOP_FORM_VALUE,
    name: shopData.name,
    url: shopData.url,
    description: shopData.description ?? "",
    categoryIds: shopData.categories.map((category) => category.id),
    region: shopData.region ?? [],
    shipping: shopData.shipping ?? "",
    contactEmail: shopData.contactEmail ?? "",
    socialMedia: shopData.socialMedia ?? {},
  };
}

function formReducer(_state: ShopEditFormValue, nextState: ShopEditFormValue): ShopEditFormValue {
  return nextState;
}

function isShopWithId(value: unknown): value is Pick<Shop, "id"> {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id?: unknown }).id === "number"
  );
}

export function useShopEditorController({
  shopId,
  submissionId,
  initialData,
  initialOgImage,
  initialShop,
}: ShopEditorModeProps) {
  const { locale, messages } = useI18n();
  const common = messages.common;
  const shopsMessages = messages.shops;
  const suggestionsMsg = messages.submissions.suggestions;
  const shopFormI18n = getShopEditFormI18n(locale);
  const isSubmissionMode = submissionId !== undefined;
  const isNew = shopId === "new";
  const hasImmediateFormData = initialData !== undefined;
  const { phase: savedPhase, show: showSaved } = useSaveNotification();

  const { data: categories = [] } = useAdminCategories();
  const { data: shopData, isLoading: isLoadingShop } = useAdminShop(
    typeof shopId === "number" && !hasImmediateFormData ? shopId : null,
  );
  const shopMutation = useSaveShop(isSubmissionMode ? null : isNew ? null : (shopId as number));
  const submissionMutation = useEditSubmission();
  const refetchImageMutation = useRefetchShopImage(typeof shopId === "number" ? shopId : 0);
  const setOgImageMutation = useSetShopOgImage(typeof shopId === "number" ? shopId : 0);
  const setVisibilityMutation = useSetShopVisibility();
  const title = isSubmissionMode
    ? shopsMessages.editCard.titleSubmissionEdit
    : isNew
      ? shopsMessages.editCard.titleNew
      : shopsMessages.editCard.titleEdit;
  const [form, setForm] = useReducer(formReducer, getInitialFormValue(initialData, shopData));
  const [imageState, setImageState] = useState<ShopImageState>(() =>
    getInitialImageState(initialData, initialOgImage, isSubmissionMode),
  );
  const [showDeferredShopImage, setShowDeferredShopImage] = useState(() => initialShop === undefined);
  const [rejectState, setRejectState] = useState<RejectState>(() => getEmptyRejectState());
  const previewImageQuery = usePreviewImage(isSubmissionMode ? imageState.previewRequestUrl : null);
  const showLoadingSkeleton = isLoadingShop && !hasImmediateFormData;

  useEffect(() => {
    if (isNew || isSubmissionMode || hasImmediateFormData || shopData === null) return;
    setForm(getInitialFormValue(initialData, shopData));
  }, [hasImmediateFormData, initialData, isNew, isSubmissionMode, shopData]);

  useEffect(() => {
    if (initialShop === undefined) return;
    setShowDeferredShopImage(false);
    const frameId = requestAnimationFrame(() => {
      setShowDeferredShopImage(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, [initialShop]);

  const isPending = shopMutation.isPending || submissionMutation.isPending;
  const isError = shopMutation.isError || submissionMutation.isError;
  const error = shopMutation.error ?? submissionMutation.error;
  const isRejecting = setVisibilityMutation.isPending;
  const activeShop = shopData ?? initialShop ?? null;
  const canReject = !isNew && !isSubmissionMode && activeShop !== null;

  usePersistedTextareaHeight("sef-description", "shops:textarea:description", !showLoadingSkeleton);

  const canSave = form.name.trim() !== "" && form.url.trim() !== "" && !isPending;
  const previewImage =
    imageState.previewOverride === undefined
      ? (previewImageQuery.data?.ogImage ?? null)
      : imageState.previewOverride;
  const ogImageInput =
    imageState.draftOgImageInput ??
    (isSubmissionMode ? (previewImageQuery.data?.ogImage ?? "") : (activeShop?.ogImage ?? ""));
  const displayImage = isSubmissionMode
    ? previewImage
    : showDeferredShopImage
      ? (activeShop?.ogImage ?? null)
      : null;
  const isRefetchPending = isSubmissionMode
    ? previewImageQuery.isFetching
    : refetchImageMutation.isPending;

  function getSubmissionOgImageValue() {
    if (!isSubmissionMode) return null;

    if (imageState.draftOgImageInput !== null) {
      const trimmedDraft = imageState.draftOgImageInput.trim();
      return trimmedDraft.length > 0 ? trimmedDraft : null;
    }

    return previewImage?.trim() || null;
  }

  async function handleSave(options?: { onSuccess?: (saved: unknown) => void | Promise<void> }) {
    if (isSubmissionMode && submissionId !== undefined) {
      const saved = await submissionMutation.mutateAsync({
        id: submissionId,
        data: form,
        ogImage: getSubmissionOgImageValue(),
      });
      if (options?.onSuccess) {
        await options.onSuccess(saved);
      } else {
        showSaved();
      }
      return saved;
    }

    const saved = await shopMutation.mutateAsync(form);
    if (options?.onSuccess) {
      await options.onSuccess(saved);
    } else {
      showSaved();
    }
    return saved;
  }

  function handleOpenRejectCard() {
    setRejectState({
      open: true,
      reason: "",
      longText: "",
      token: generateRejectionToken(),
    });
  }

  function handleReject() {
    const id = shopId as number;
    setVisibilityMutation.mutate(
      {
        id,
        visibility: "rejected",
        rejectionToken: rejectState.token ?? undefined,
        rejectionLongText: rejectState.longText || null,
      },
      {
        onSuccess: () => {
          setRejectState(getEmptyRejectState());
        },
      },
    );
  }

  function handleOgImageInputChange(value: string) {
    setImageState((current) => ({
      ...current,
      draftOgImageInput: value,
      previewOverride: isSubmissionMode ? (value.trim() || null) : current.previewOverride,
    }));
  }

  function handleRefreshImage() {
    if (isSubmissionMode) {
      const nextUrl = form.url.trim() || null;
      setImageState((current) => ({
        ...current,
        draftOgImageInput: null,
        previewOverride: undefined,
        previewRequestUrl: nextUrl,
      }));
      if (nextUrl && nextUrl === imageState.previewRequestUrl) {
        previewImageQuery.refetch();
      }
      return;
    }

    refetchImageMutation.mutate();
  }

  function handleApplyImage() {
    if (isSubmissionMode) {
      setImageState((current) => ({
        ...current,
        previewOverride: ogImageInput || null,
      }));
      return;
    }

    setOgImageMutation.mutate(ogImageInput || null);
  }

  useKeyboardSave(() => {
    if (canSave) void handleSave();
  });

  return {
    activeShop,
    canReject,
    canSave,
    categories,
    common,
    displayImage,
    error,
    form,
    handleApplyImage,
    handleOgImageInputChange,
    handleOpenRejectCard,
    handleRefreshImage,
    handleReject,
    handleSave,
    isError,
    isLoadingShop,
    isNew,
    isPending,
    isRefetchPending,
    isRejecting,
    isRejectError: setVisibilityMutation.isError,
    isSubmissionMode,
    name: form.name,
    ogImageInput,
    previewImageLabel: shopsMessages.editCard.previewImage,
    placeholder: shopsMessages.editCard.noImage,
    rejectState,
    rejectStateIsOpen: rejectState.open,
    savedPhase,
    setImageLabel: shopsMessages.editCard.setImage,
    setRejectState,
    setForm,
    shopFormI18n,
    shopsMessages,
    showLoadingSkeleton,
    showSaved,
    title,
    suggestionsMsg,
    reloadImageLabel: shopsMessages.editCard.reloadImage,
    isSavingImage: !isSubmissionMode && setOgImageMutation.isPending,
    previewImageQuery,
    getSavedShopId(saved: unknown) {
      return isShopWithId(saved) ? saved.id : null;
    },
  };
}

type ShopEditorController = ReturnType<typeof useShopEditorController>;

export function ShopEditorFormContent({ controller }: { controller: ShopEditorController }) {
  const {
    categories,
    displayImage,
    error,
    form,
    handleApplyImage,
    handleOgImageInputChange,
    handleRefreshImage,
    isError,
    isLoadingShop,
    isNew,
    isRefetchPending,
    isSavingImage,
    ogImageInput,
    placeholder,
    previewImageLabel,
    reloadImageLabel,
    setForm,
    setImageLabel,
    shopFormI18n,
    shopsMessages,
    showLoadingSkeleton,
  } = controller;

  return (
    <>
      {!isNew && (
        <ShopPreviewImageSection
          displayImage={displayImage}
          isLoading={isLoadingShop}
          isRefetchPending={isRefetchPending}
          isSavingImage={isSavingImage}
          name={controller.name}
          ogImageInput={ogImageInput}
          onApplyImage={handleApplyImage}
          onChangeOgImageInput={handleOgImageInputChange}
          onRefreshImage={handleRefreshImage}
          placeholder={placeholder}
          previewImageLabel={previewImageLabel}
          reloadImageLabel={reloadImageLabel}
          setImageLabel={setImageLabel}
        />
      )}

      {showLoadingSkeleton ? (
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
        />
      )}

      {isError && (
        <p className="text-red-500 text-sm mt-4">
          {error instanceof Error ? error.message : shopsMessages.editCard.errorSaving}
        </p>
      )}
    </>
  );
}

export function ShopEditorRejectOverlay({ controller }: { controller: ShopEditorController }) {
  const {
    activeShop,
    common,
    handleReject,
    isRejectError,
    isRejecting,
    rejectState,
    setRejectState,
    shopsMessages,
    suggestionsMsg,
  } = controller;

  return (
    <RejectDialog
      open={rejectState.open}
      onClose={() => setRejectState(getEmptyRejectState())}
      title={shopsMessages.editCard.rejectTitle}
      name={activeShop?.name ?? ""}
      url={activeShop?.url ?? ""}
      adminNote={rejectState.reason}
      onAdminNoteChange={(value) => setRejectState((current) => ({ ...current, reason: value }))}
      rejectionLongText={rejectState.longText}
      onRejectionLongTextChange={(value) =>
        setRejectState((current) => ({ ...current, longText: value }))
      }
      rejectionToken={rejectState.token}
      onSubmit={handleReject}
      isPending={isRejecting}
      isError={isRejectError}
      errorMessage={common.unknownError}
      submitLabel={shopsMessages.editCard.rejectSubmit}
      headerIcon={<SFXmarkCircleFill className={dialogHeaderIconClass} />}
      storageKey="shops:reject-dialog-size"
      adminNoteStorageKey="shops:textarea:reject-note"
      rejectionLongStorageKey="shops:textarea:reject-long"
      messages={{
        cancel: common.cancel,
        comment: suggestionsMsg.comment,
        optional: suggestionsMsg.optional,
        commentPlaceholder: suggestionsMsg.rejectReasonPlaceholder,
        rejectionLongLabel: suggestionsMsg.rejectionLongLabel,
        rejectionLongPlaceholder: suggestionsMsg.rejectionLongPlaceholder,
        errorPrefix: suggestionsMsg.reviewErrorPrefix,
      }}
    />
  );
}

interface ShopPreviewImageSectionProps {
  displayImage: string | null;
  isLoading: boolean;
  isRefetchPending: boolean;
  isSavingImage: boolean;
  name: string;
  ogImageInput: string;
  onApplyImage: () => void;
  onChangeOgImageInput: (value: string) => void;
  onRefreshImage: () => void;
  placeholder: string;
  previewImageLabel: string;
  reloadImageLabel: string;
  setImageLabel: string;
}

function ShopPreviewImageSection({
  displayImage,
  isLoading,
  isRefetchPending,
  isSavingImage,
  name,
  ogImageInput,
  onApplyImage,
  onChangeOgImageInput,
  onRefreshImage,
  placeholder,
  previewImageLabel,
  reloadImageLabel,
  setImageLabel,
}: ShopPreviewImageSectionProps) {
  const buttonClass =
    "flex items-center gap-1.5 px-3 py-1.5 border border-[var(--ds-border)] rounded-control text-xs text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors disabled:opacity-40";

  return (
    <div className="mb-4 pb-4 border-b border-[var(--ds-border-subtle)]">
      <div className="flex items-center gap-3 mb-2">
        <div className="shrink-0 w-14 h-14 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-alt)] overflow-hidden flex items-center justify-center">
          {displayImage ? (
            <img src={displayImage} alt="" className="w-full h-full object-contain" />
          ) : name ? (
            <span className="text-xl font-bold text-[var(--ds-text-subtle)] select-none">
              {name.charAt(0).toUpperCase()}
            </span>
          ) : (
            <SFStorefrontFill className="w-5 h-5 text-[var(--ds-text-subtle)]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <FormLabelText>{previewImageLabel}</FormLabelText>
          <input
            type="text"
            value={ogImageInput}
            onChange={(e) => onChangeOgImageInput(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-1.5 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onRefreshImage}
          disabled={isRefetchPending || isLoading}
          className={buttonClass}
        >
          <SFArrowClockwise className={`w-3 h-3 ${isRefetchPending ? "animate-spin" : ""}`} />
          {reloadImageLabel}
        </button>
        <button
          type="button"
          onClick={onApplyImage}
          disabled={isSavingImage || isLoading}
          className={buttonClass}
        >
          <SFDocumentOnDocumentFill className="w-3 h-3" />
          {setImageLabel}
        </button>
      </div>
    </div>
  );
}
