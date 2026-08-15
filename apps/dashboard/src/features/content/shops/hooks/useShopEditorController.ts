import { useEffect, useReducer, useRef, useState } from "react";

import { generateRejectionToken } from "@lmaa/shared";
import type { ShopEditFormValue } from "@lmaa/ui/shop-edit-form";

import { useSaveNotification } from "@/components/ui/SaveNotification.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAdminCategories } from "@/features/content/hooks/useAdminCategories.ts";
import { useEditSubmission } from "@/features/overview/hooks/useSubmissions.ts";
import { usePersistedTextareaHeight } from "@/lib/hooks/usePersistedTextareaHeight.ts";

import {
  useAdminShop,
  useFetchPreviewImage,
  usePreviewImage,
  useSaveShop,
  useSetShopOgImage,
  useSetShopVisibility,
} from "./useAdminShops.ts";
import type {
  RejectState,
  ShopCheckJsonPayload,
  ShopEditorModeProps,
  ShopImageState,
} from "../shop-editor-types.ts";
import {
  applyShopCheckJsonToForm,
  formReducer,
  getEmptyRejectState,
  getInitialFormValue,
  getInitialImageState,
  isShopWithId,
} from "../shop-editor-utils.ts";
import { getShopEditFormI18n } from "../shop-form-i18n.ts";

export function useShopEditorController({
  shopId,
  submissionId,
  initialData,
  initialOgImage,
  initialShop,
  dataRevision,
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
  const fetchPreviewImageMutation = useFetchPreviewImage();
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
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ShopEditFormValue, string>>>(
    {},
  );
  const previewImageQuery = usePreviewImage(isSubmissionMode ? imageState.previewRequestUrl : null);
  const showLoadingSkeleton = isLoadingShop && !hasImmediateFormData;

  // The automated check writes into the suggestion whilst this page may be
  // open. Its findings win over whatever the form is holding, so a new revision
  // reseeds the form rather than being merged into it.
  const seededRevisionRef = useRef(dataRevision);
  useEffect(() => {
    if (dataRevision === undefined || seededRevisionRef.current === dataRevision) return;
    seededRevisionRef.current = dataRevision;
    setForm(getInitialFormValue(initialData, shopData));
    setImageState(getInitialImageState(initialData, initialOgImage, isSubmissionMode));
  }, [dataRevision, initialData, initialOgImage, isSubmissionMode, shopData]);

  const formInitializedRef = useRef(false);
  useEffect(() => {
    if (isNew || isSubmissionMode || hasImmediateFormData || shopData == null) return;
    if (formInitializedRef.current) return;
    formInitializedRef.current = true;
    const baseForm = getInitialFormValue(initialData, shopData);
    if (shopData.reviewData && shopData.needsReview) {
      const withReview = applyShopCheckJsonToForm(
        baseForm,
        shopData.reviewData as ShopCheckJsonPayload,
        categories,
      );
      setForm(withReview ?? baseForm);
    } else {
      setForm(baseForm);
    }
  }, [hasImmediateFormData, initialData, isNew, isSubmissionMode, shopData, categories]);

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
    : imageState.draftOgImageInput !== null
      ? imageState.draftOgImageInput.trim() || null
      : showDeferredShopImage
        ? (activeShop?.ogImage ?? null)
        : null;
  const isRefetchPending = isSubmissionMode
    ? previewImageQuery.isFetching
    : fetchPreviewImageMutation.isPending;

  function getSubmissionOgImageValue() {
    if (!isSubmissionMode) return null;

    if (imageState.draftOgImageInput !== null) {
      const trimmedDraft = imageState.draftOgImageInput.trim();
      return trimmedDraft.length > 0 ? trimmedDraft : null;
    }

    return previewImage?.trim() || null;
  }

  async function handleSave(options?: {
    onSuccess?: (saved: unknown) => void | Promise<void>;
    needsReview?: boolean;
  }) {
    setSaveErrorMessage(null);
    if (formErrors.socialMedia) {
      setSaveErrorMessage(formErrors.socialMedia);
      throw new Error(formErrors.socialMedia);
    }
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

      const saved = await shopMutation.mutateAsync({
        formData: form,
        needsReview: options?.needsReview,
      });
      const nextOgImage = ogImageInput.trim() || null;
      const currentOgImage = activeShop?.ogImage?.trim() || null;
      if (!isNew && nextOgImage !== currentOgImage) {
        await setOgImageMutation.mutateAsync(nextOgImage);
      }
      if (options?.onSuccess) {
        await options.onSuccess(saved);
      } else {
        showSaved();
      }
      return saved;
    } catch (error) {
      const message = error instanceof Error ? error.message : common.unknownError;
      setSaveErrorMessage(() => message);
      throw error;
    }
  }

  async function handleSaveSafely(options?: {
    onSuccess?: (saved: unknown) => void | Promise<void>;
    needsReview?: boolean;
  }) {
    try {
      const saveOptions = options ? { ...options } : undefined;
      return await handleSave(saveOptions);
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

    const nextUrl = form.url.trim() || activeShop?.url?.trim() || "";
    if (!nextUrl) return;
    fetchPreviewImageMutation.mutate(nextUrl, {
      onSuccess: ({ ogImage }) => {
        setImageState((current) => ({
          ...current,
          draftOgImageInput: ogImage ?? "",
        }));
      },
    });
  }

  function handleApplyImage() {
    const nextOgImage = ogImageInput.trim() || null;
    if (isSubmissionMode) {
      setImageState((current) => ({
        ...current,
        previewOverride: nextOgImage,
      }));
      return;
    }

    setOgImageMutation.mutate(nextOgImage);
  }

  function handleChangeLogoBackground(value: string | null) {
    setForm({ ...form, logoBackgroundColor: value });
  }

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
    logoBackgroundColor: form.logoBackgroundColor,
    onChangeLogoBackground: handleChangeLogoBackground,
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
    setFormErrors,
    shopFormI18n,
    shopsMessages,
    showLoadingSkeleton,
    showSaved,
    title,
    suggestionsMsg,
    openImageLabel: shopsMessages.editCard.openImage,
    reloadImageLabel: shopsMessages.editCard.reloadImage,
    isSavingImage: !isSubmissionMode && setOgImageMutation.isPending,
    previewImageQuery,
    getSavedShopId(saved: unknown) {
      return isShopWithId(saved) ? saved.id : null;
    },
    saveErrorMessage,
    formErrors,
    clearSaveError() {
      setSaveErrorMessage(null);
    },
    handleSaveSafely,
  };
}

export type ShopEditorController = ReturnType<typeof useShopEditorController>;
