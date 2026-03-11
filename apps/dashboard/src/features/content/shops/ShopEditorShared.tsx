import {
  ArrowClockwiseIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  StorefrontIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useEffect, useReducer, useState } from "react";

import { generateRejectionToken, type AdminShopListItem, type Shop } from "@lmaa/shared";
import { REGION_CODES } from "@lmaa/shared";
import { EMPTY_SHOP_FORM_VALUE, FormLabelText, JsonEditor, ShopEditForm } from "@lmaa/ui";
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
  editingRejection: boolean;
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
    editingRejection: false,
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
    headquartersStreet: shopData.headquarters?.street ?? "",
    headquartersPostalCode: shopData.headquarters?.postalCode ?? "",
    headquartersCity: shopData.headquarters?.city ?? "",
    headquartersState: shopData.headquarters?.state ?? "",
    headquartersCountryCode: shopData.headquarters?.countryCode ?? "",
    headquartersLatitude:
      shopData.headquarters?.latitude !== null && shopData.headquarters?.latitude !== undefined
        ? String(shopData.headquarters.latitude)
        : "",
    headquartersLongitude:
      shopData.headquarters?.longitude !== null && shopData.headquarters?.longitude !== undefined
        ? String(shopData.headquarters.longitude)
        : "",
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

type ShopCheckJsonPayload = {
  name?: unknown;
  url?: unknown;
  description?: unknown;
  categories?: unknown;
  contactEmail?: unknown;
  shippingRegions?: unknown;
  socialMedia?: unknown;
  headquarters?: unknown;
  geo?: unknown;
};

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => getString(entry))
    .filter((entry): entry is string => entry !== null);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeCategoryName(value: string) {
  return value.trim().toLocaleLowerCase("de-DE");
}

function applyShopCheckJsonToForm(
  currentForm: ShopEditFormValue,
  payload: ShopCheckJsonPayload,
  categories: { id: number; name: string }[],
): ShopEditFormValue | null {
  const nextForm: ShopEditFormValue = { ...currentForm };
  let changed = false;

  const name = getString(payload.name);
  if (name !== null) {
    nextForm.name = name;
    changed = true;
  }

  const url = getString(payload.url);
  if (url !== null) {
    nextForm.url = url;
    changed = true;
  }

  const description = getString(payload.description);
  if (description !== null) {
    nextForm.description = description;
    changed = true;
  }

  const contactEmail = getString(payload.contactEmail);
  if (contactEmail !== null) {
    nextForm.contactEmail = contactEmail;
    changed = true;
  }

  const categoryNames = getStringArray(payload.categories);
  if (categoryNames.length > 0) {
    const categoryIdByName = new Map(
      categories.map((category) => [normalizeCategoryName(category.name), category.id] as const),
    );
    const categoryIds = categoryNames
      .map((categoryName) => categoryIdByName.get(normalizeCategoryName(categoryName)) ?? null)
      .filter((categoryId): categoryId is number => categoryId !== null);
    if (categoryIds.length > 0) {
      nextForm.categoryIds = Array.from(new Set(categoryIds));
      changed = true;
    }
  }

  const shippingRegions = getStringArray(payload.shippingRegions)
    .map((region) => region.toUpperCase())
    .filter((region): region is (typeof REGION_CODES)[number] =>
      REGION_CODES.includes(region as (typeof REGION_CODES)[number]),
    );
  if (shippingRegions.length > 0) {
    nextForm.region = Array.from(new Set(shippingRegions));
    changed = true;
  }

  const socialMedia = getRecord(payload.socialMedia);
  if (socialMedia !== null) {
    const socialMediaEntries = Object.entries(socialMedia).flatMap(([platform, value]) => {
      const normalizedValue = getString(value);
      return normalizedValue === null ? [] : ([[platform, normalizedValue]] as const);
    });
    const mappedSocialMedia = Object.fromEntries(socialMediaEntries) as Record<string, string>;
    if (Object.keys(mappedSocialMedia).length > 0) {
      nextForm.socialMedia = { ...nextForm.socialMedia, ...mappedSocialMedia };
      changed = true;
    }
  }

  const headquarters = getRecord(payload.headquarters);
  if (headquarters !== null) {
    const street = getString(headquarters.street);
    if (street !== null) {
      nextForm.headquartersStreet = street;
      changed = true;
    }

    const postalCode = getString(headquarters.postalCode);
    if (postalCode !== null) {
      nextForm.headquartersPostalCode = postalCode;
      changed = true;
    }

    const city = getString(headquarters.city);
    if (city !== null) {
      nextForm.headquartersCity = city;
      changed = true;
    }

    const state = getString(headquarters.state);
    if (state !== null) {
      nextForm.headquartersState = state;
      changed = true;
    }

    const countryCode = getString(headquarters.countryCode);
    if (countryCode !== null) {
      nextForm.headquartersCountryCode = countryCode.toUpperCase();
      changed = true;
    }
  }

  const geo = getRecord(payload.geo);
  if (geo !== null) {
    const latitude =
      typeof geo.latitude === "number"
        ? String(geo.latitude)
        : getString(geo.latitude);
    if (latitude !== null) {
      nextForm.headquartersLatitude = latitude;
      changed = true;
    }

    const longitude =
      typeof geo.longitude === "number"
        ? String(geo.longitude)
        : getString(geo.longitude);
    if (longitude !== null) {
      nextForm.headquartersLongitude = longitude;
      changed = true;
    }
  }

  return changed ? nextForm : null;
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
  const [showDeferredShopImage, setShowDeferredShopImage] = useState(
    () => initialShop === undefined,
  );
  const [rejectState, setRejectState] = useState<RejectState>(() => getEmptyRejectState());
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
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
    setSaveErrorMessage(null);
    try {
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
    } catch (error) {
      setSaveErrorMessage(error instanceof Error ? error.message : common.unknownError);
      throw error;
    }
  }

  async function handleSaveSafely(options?: { onSuccess?: (saved: unknown) => void | Promise<void> }) {
    try {
      return await handleSave(options);
    } catch {
      return null;
    }
  }

  function handleOpenRejectCard(editingRejection = false) {
    setRejectState({
      editingRejection,
      open: true,
      reason: editingRejection ? (activeShop?.rejectionAdminNote ?? "") : "",
      longText: editingRejection ? (activeShop?.rejectionLongText ?? "") : "",
      token: editingRejection ? (activeShop?.rejectionToken ?? null) : generateRejectionToken(),
    });
  }

  function handleReject() {
    const id = shopId as number;
    setVisibilityMutation.mutate(
      {
        id,
        visibility: "rejected",
        rejectionToken: rejectState.token ?? undefined,
        rejectionAdminNote: rejectState.reason || null,
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
      previewOverride: isSubmissionMode ? value.trim() || null : current.previewOverride,
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
    if (canSave) void handleSaveSafely();
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
    blurSocialMediaOnPaste: isSubmissionMode,
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
    saveErrorMessage,
    clearSaveError() {
      setSaveErrorMessage(null);
    },
    handleSaveSafely,
  };
}

type ShopEditorController = ReturnType<typeof useShopEditorController>;

export function ShopEditorFormContent({ controller }: { controller: ShopEditorController }) {
  const [shopCheckJson, setShopCheckJson] = useState("");
  const [jsonImportError, setJsonImportError] = useState<string | null>(null);
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
    saveErrorMessage,
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

  function applyShopCheckJson(jsonText: string, options?: { showErrors?: boolean }) {
    const trimmed = jsonText.trim();
    if (trimmed === "") {
      if (options?.showErrors) {
        setJsonImportError(shopFormI18n.messages.jsonInvalidError ?? "Ungültiges JSON.");
      }
      return false;
    }

    try {
      const parsed = JSON.parse(trimmed) as ShopCheckJsonPayload;
      const nextForm = applyShopCheckJsonToForm(form, parsed, categories);
      if (!nextForm) {
        if (options?.showErrors) {
          setJsonImportError(
            shopFormI18n.messages.jsonImportError ??
              "Das JSON konnte nicht auf das Formular abgebildet werden.",
          );
        }
        return false;
      }
      setForm(nextForm);
      setJsonImportError(null);
      return true;
    } catch {
      if (options?.showErrors) {
        setJsonImportError(shopFormI18n.messages.jsonInvalidError ?? "Ungültiges JSON.");
      }
      return false;
    }
  }

  function handleShopCheckJsonPaste(event: ClipboardEvent) {
    const pastedText = event.clipboardData?.getData("text/plain")?.trim();
    if (!pastedText) return;
    setShopCheckJson(pastedText);
    if (applyShopCheckJson(pastedText)) {
      event.preventDefault();
    }
  }

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
          countryCodeOptions={shopFormI18n.countryCodeOptions}
          regionOptions={shopFormI18n.regionOptions}
          messages={shopFormI18n.messages}
          blurSocialMediaOnPaste={controller.blurSocialMediaOnPaste}
          topAside={
            <div className="grid h-full min-h-0 grid-rows-[auto_1fr]">
              <div className="mb-1 flex items-center justify-between gap-3">
                <FormLabelText className="mb-0">{shopFormI18n.messages.jsonToolTitle}</FormLabelText>
                <button
                  type="button"
                  onClick={() => {
                    void applyShopCheckJson(shopCheckJson, { showErrors: true });
                  }}
                  className="flex items-center gap-1.5 h-7 px-3 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-xs font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors"
                >
                  <DownloadIcon weight="duotone" className="w-3.5 h-3.5" />
                  {shopFormI18n.messages.jsonApplyLabel}
                </button>
              </div>
              <JsonEditor
                id="shop-check-json"
                value={shopCheckJson}
                onChange={setShopCheckJson}
                onPaste={handleShopCheckJsonPaste}
                placeholder="{}"
                height="100%"
                className="h-full"
              />
              {jsonImportError && <p className="mt-1 text-xs text-red-500">{jsonImportError}</p>}
            </div>
          }
        />
      )}

      {saveErrorMessage && (
        <div className="mt-4 rounded-control border border-[var(--ds-btn-danger-border)] bg-[var(--ds-btn-danger-hover-bg)] px-3 py-2 text-sm text-[var(--ds-btn-danger-text)]">
          {saveErrorMessage}
        </div>
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
      title={
        rejectState.editingRejection
          ? suggestionsMsg.reviewEditRejectionTitle
          : shopsMessages.editCard.rejectTitle
      }
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
      submitLabel={rejectState.editingRejection ? common.save : shopsMessages.editCard.rejectSubmit}
      submitVariant={rejectState.editingRejection ? "primary" : "danger"}
      submitIcon={
        rejectState.editingRejection ? (
          <DownloadIcon weight="duotone" className="w-3.5 h-3.5" />
        ) : undefined
      }
      headerIcon={
        rejectState.editingRejection ? (
          <FileTextIcon weight="duotone" className={dialogHeaderIconClass} />
        ) : (
          <XCircleIcon weight="duotone" className={dialogHeaderIconClass} />
        )
      }
      storageKey="shops:reject-dialog-size"
      adminNoteStorageKey="shops:textarea:reject-note"
      rejectionLongStorageKey="shops:textarea:reject-long"
      messages={{
        cancel: common.cancel,
        comment: suggestionsMsg.comment,
        copyUrl: common.copyUrl,
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
            <StorefrontIcon weight="duotone" className="w-5 h-5 text-[var(--ds-text-subtle)]" />
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
          <ArrowClockwiseIcon
            weight="duotone"
            className={`w-3 h-3 ${isRefetchPending ? "animate-spin" : ""}`}
          />
          {reloadImageLabel}
        </button>
        <button
          type="button"
          onClick={onApplyImage}
          disabled={isSavingImage || isLoading}
          className={buttonClass}
        >
          <CopyIcon weight="duotone" className="w-3 h-3" />
          {setImageLabel}
        </button>
      </div>
    </div>
  );
}
