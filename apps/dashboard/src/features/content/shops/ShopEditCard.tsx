import { type ClipboardEvent, useEffect, useReducer, useRef, useState } from "react";
import SFArrowClockwise from "sf-symbols-lib/monochrome/SFArrowClockwise";
import SFSquareAndArrowDownFill from "sf-symbols-lib/monochrome/SFSquareAndArrowDownFill";
import SFStorefrontFill from "sf-symbols-lib/monochrome/SFStorefrontFill";
import SFXmarkCircleFill from "sf-symbols-lib/monochrome/SFXmarkCircleFill";

import { generateRejectionToken } from "@lmaa/shared";
import { EMPTY_SHOP_FORM_VALUE, ShopEditForm } from "@lmaa/ui";
import type { ShopEditFormValue } from "@lmaa/ui";

import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { RejectDialog } from "@/components/ui/RejectDialog.tsx";
import { SaveNotification, useSaveNotification } from "@/components/ui/SaveNotification.tsx";
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
import { getShopEditFormI18n } from "@/features/content/shops/shop-form-i18n.ts";
import { useEditSubmission } from "@/features/overview/hooks/useSubmissions.ts";
import { useKeyboardSave } from "@/lib/useKeyboardSave.ts";
import { usePersistedTextareaHeight } from "@/lib/usePersistedTextareaHeight.ts";

type ShopEditCardProps = {
  initialData?: Partial<ShopEditFormValue>;
  onClose: () => void;
  onSaved: () => void;
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
  isSubmissionMode: boolean,
): ShopImageState {
  return {
    draftOgImageInput: null,
    previewOverride: undefined,
    previewRequestUrl: isSubmissionMode ? initialData?.url?.trim() || null : null,
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
  const suggestionsMsg = messages.submissions.suggestions;
  const shopFormI18n = getShopEditFormI18n(locale);
  const isSubmissionMode = submissionId !== undefined;
  const isNew = shopId === "new";
  const { phase: savedPhase, show: showSaved } = useSaveNotification();

  const { data: categories = [] } = useAdminCategories();
  const { data: shopData, isLoading: isLoadingShop } = useAdminShop(
    typeof shopId === "number" ? shopId : null,
  );
  const shopMutation = useSaveShop(isSubmissionMode ? null : isNew ? null : (shopId as number));
  const submissionMutation = useEditSubmission();
  const refetchImageMutation = useRefetchShopImage(typeof shopId === "number" ? shopId : 0);
  const setOgImageMutation = useSetShopOgImage(typeof shopId === "number" ? shopId : 0);
  const setVisibilityMutation = useSetShopVisibility();

  const initialFormValue = getInitialFormValue(initialData, shopData);
  const editorStateKey = isNew
    ? "new"
    : isSubmissionMode
      ? `submission-${submissionId ?? "unknown"}`
      : `shop-${shopId}`;
  const title = isSubmissionMode
    ? shopsMessages.editCard.titleSubmissionEdit
    : isNew
      ? shopsMessages.editCard.titleNew
      : shopsMessages.editCard.titleEdit;

  return (
    <ShopEditCardEditor
      categories={categories ?? []}
      common={common}
      editorStateKey={editorStateKey}
      initialData={initialData}
      initialFormValue={initialFormValue}
      isLoadingShop={isLoadingShop}
      isNew={isNew}
      isSubmissionMode={isSubmissionMode}
      onClose={onClose}
      onSaved={onSaved}
      refetchImageMutation={refetchImageMutation}
      savedPhase={savedPhase}
      setOgImageMutation={setOgImageMutation}
      setVisibilityMutation={setVisibilityMutation}
      shopData={shopData ?? null}
      shopFormI18n={shopFormI18n}
      shopId={shopId}
      shopMutation={shopMutation}
      shopsMessages={shopsMessages}
      showSaved={showSaved}
      submissionId={submissionId}
      submissionMutation={submissionMutation}
      suggestionsMsg={suggestionsMsg}
      title={title}
    />
  );
}

interface ShopEditCardEditorProps {
  categories: NonNullable<Awaited<ReturnType<typeof useAdminCategories>>["data"]>;
  common: ReturnType<typeof useI18n>["messages"]["common"];
  editorStateKey: string;
  initialData?: Partial<ShopEditFormValue>;
  initialFormValue: ShopEditFormValue;
  isLoadingShop: boolean;
  isNew: boolean;
  isSubmissionMode: boolean;
  onClose: () => void;
  onSaved: () => void;
  refetchImageMutation: ReturnType<typeof useRefetchShopImage>;
  savedPhase: ReturnType<typeof useSaveNotification>["phase"];
  setOgImageMutation: ReturnType<typeof useSetShopOgImage>;
  setVisibilityMutation: ReturnType<typeof useSetShopVisibility>;
  shopData: Awaited<ReturnType<typeof useAdminShop>>["data"] | null;
  shopFormI18n: ReturnType<typeof getShopEditFormI18n>;
  shopId: ShopEditCardProps["shopId"];
  shopMutation: ReturnType<typeof useSaveShop>;
  shopsMessages: ReturnType<typeof useI18n>["messages"]["shops"];
  showSaved: ReturnType<typeof useSaveNotification>["show"];
  submissionId: number | undefined;
  submissionMutation: ReturnType<typeof useEditSubmission>;
  suggestionsMsg: ReturnType<typeof useI18n>["messages"]["submissions"]["suggestions"];
  title: string;
}

function ShopEditCardEditor({
  categories,
  common,
  editorStateKey,
  initialData,
  initialFormValue,
  isLoadingShop,
  isNew,
  isSubmissionMode,
  onClose,
  onSaved,
  refetchImageMutation,
  savedPhase,
  setOgImageMutation,
  setVisibilityMutation,
  shopData,
  shopFormI18n,
  shopId,
  shopMutation,
  shopsMessages,
  showSaved,
  submissionId,
  submissionMutation,
  suggestionsMsg,
  title,
}: ShopEditCardEditorProps) {
  return (
    <OverlayCard
      open
      onClose={onClose}
      size={{ storageKey: "shops:edit-card-size", defaultWidth: 512 }}
      aria-label={title}
    >
      <OverlayCard.Header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SFStorefrontFill className={dialogHeaderIconClass} />
          <h2 className="text-base font-semibold text-[var(--ds-text)]">{title}</h2>
        </div>
        <SaveNotification phase={savedPhase} label={common.saved} />
      </OverlayCard.Header>

      <ShopEditCardContent
        key={editorStateKey}
        categories={categories}
        common={common}
        initialData={initialData}
        initialFormValue={initialFormValue}
        isLoadingShop={isLoadingShop}
        isNew={isNew}
        isSubmissionMode={isSubmissionMode}
        onClose={onClose}
        onSaved={onSaved}
        refetchImageMutation={refetchImageMutation}
        setOgImageMutation={setOgImageMutation}
        setVisibilityMutation={setVisibilityMutation}
        shopData={shopData}
        shopFormI18n={shopFormI18n}
        shopId={shopId}
        shopMutation={shopMutation}
        shopsMessages={shopsMessages}
        showSaved={showSaved}
        submissionId={submissionId}
        submissionMutation={submissionMutation}
        suggestionsMsg={suggestionsMsg}
      />
    </OverlayCard>
  );
}

interface ShopEditCardContentProps {
  categories: NonNullable<Awaited<ReturnType<typeof useAdminCategories>>["data"]>;
  common: ReturnType<typeof useI18n>["messages"]["common"];
  initialData?: Partial<ShopEditFormValue>;
  initialFormValue: ShopEditFormValue;
  isLoadingShop: boolean;
  isNew: boolean;
  isSubmissionMode: boolean;
  onClose: () => void;
  onSaved: () => void;
  refetchImageMutation: ReturnType<typeof useRefetchShopImage>;
  setOgImageMutation: ReturnType<typeof useSetShopOgImage>;
  setVisibilityMutation: ReturnType<typeof useSetShopVisibility>;
  shopData: Awaited<ReturnType<typeof useAdminShop>>["data"] | null;
  shopFormI18n: ReturnType<typeof getShopEditFormI18n>;
  shopId: ShopEditCardProps["shopId"];
  shopMutation: ReturnType<typeof useSaveShop>;
  shopsMessages: ReturnType<typeof useI18n>["messages"]["shops"];
  showSaved: ReturnType<typeof useSaveNotification>["show"];
  submissionId: number | undefined;
  submissionMutation: ReturnType<typeof useEditSubmission>;
  suggestionsMsg: ReturnType<typeof useI18n>["messages"]["submissions"]["suggestions"];
}

function ShopEditCardContent({
  categories,
  common,
  initialData,
  initialFormValue,
  isLoadingShop,
  isNew,
  isSubmissionMode,
  onClose,
  onSaved,
  refetchImageMutation,
  setOgImageMutation,
  setVisibilityMutation,
  shopData,
  shopFormI18n,
  shopId,
  shopMutation,
  shopsMessages,
  showSaved,
  submissionId,
  submissionMutation,
  suggestionsMsg,
}: ShopEditCardContentProps) {
  const [form, setForm] = useReducer(formReducer, initialFormValue);
  const [imageState, setImageState] = useState<ShopImageState>(() =>
    getInitialImageState(initialData, isSubmissionMode),
  );
  const [rejectState, setRejectState] = useState<RejectState>(() => getEmptyRejectState());
  const hydratedShopRef = useRef(false);
  const previewImageQuery = usePreviewImage(isSubmissionMode ? imageState.previewRequestUrl : null);

  useEffect(() => {
    if (isNew || isSubmissionMode || shopData === null || hydratedShopRef.current) return;
    hydratedShopRef.current = true;
    setForm(getInitialFormValue(initialData, shopData));
  }, [initialData, isNew, isSubmissionMode, shopData]);

  const isPending = shopMutation.isPending || submissionMutation.isPending;
  const isError = shopMutation.isError || submissionMutation.isError;
  const error = shopMutation.error ?? submissionMutation.error;

  const isRejecting = setVisibilityMutation.isPending;
  const canReject = !isNew && !isSubmissionMode && shopData?.visibility === "public";

  usePersistedTextareaHeight("sef-description", "shops:textarea:description", !isLoadingShop);

  const canSave = form.name.trim() !== "" && form.url.trim() !== "" && !isPending;
  const previewImage =
    imageState.previewOverride === undefined
      ? (previewImageQuery.data?.ogImage ?? null)
      : imageState.previewOverride;
  const ogImageInput =
    imageState.draftOgImageInput ??
    (isSubmissionMode ? (previewImageQuery.data?.ogImage ?? "") : (shopData?.ogImage ?? ""));
  const displayImage = isSubmissionMode ? previewImage : (shopData?.ogImage ?? null);
  const isRefetchPending = isSubmissionMode
    ? previewImageQuery.isFetching
    : refetchImageMutation.isPending;

  function handleSave(close = true) {
    const onSuccess = close ? onSaved : showSaved;
    if (isSubmissionMode && submissionId !== undefined) {
      submissionMutation.mutate({ id: submissionId, data: form }, { onSuccess });
    } else {
      shopMutation.mutate(form, { onSuccess });
    }
  }

  function handleOpenRejectCard() {
    setRejectState({
      open: true,
      reason: "",
      longText: "",
      token: generateRejectionToken(),
    });
  }

  const handleRejectPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text");
    if (!pastedText.includes("[REJECT_TOKEN]")) return;
    e.preventDefault();
    const token = rejectState.token ?? "";
    const replaced = pastedText.replace(/\[REJECT_TOKEN\]/g, token);
    const ta = e.currentTarget;
    const newValue =
      rejectState.reason.slice(0, ta.selectionStart) +
      replaced +
      rejectState.reason.slice(ta.selectionEnd);
    setRejectState((current) => ({ ...current, reason: newValue }));
  };

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
          onSaved();
        },
      },
    );
  }

  function handleOgImageInputChange(value: string) {
    setImageState((current) => ({ ...current, draftOgImageInput: value }));
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
    if (canSave) handleSave(false);
  });

  return (
    <>
      <OverlayCard.Body>
        {!isNew && (
          <ShopPreviewImageSection
            displayImage={displayImage}
            isLoading={isLoadingShop}
            isRefetchPending={isRefetchPending}
            isSavingImage={!isSubmissionMode && setOgImageMutation.isPending}
            name={form.name}
            ogImageInput={ogImageInput}
            onApplyImage={handleApplyImage}
            onChangeOgImageInput={handleOgImageInputChange}
            onRefreshImage={handleRefreshImage}
            placeholder={shopsMessages.editCard.noImage}
            previewImageLabel={shopsMessages.editCard.previewImage}
            reloadImageLabel={shopsMessages.editCard.reloadImage}
            setImageLabel={shopsMessages.editCard.setImage}
          />
        )}

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
          />
        )}

        {isError && (
          <p className="text-red-500 text-sm mt-4">
            {error instanceof Error ? error.message : shopsMessages.editCard.errorSaving}
          </p>
        )}
      </OverlayCard.Body>

      <ShopEditFooter
        canReject={canReject}
        canSave={canSave}
        isPending={isPending}
        onClose={onClose}
        onOpenRejectCard={handleOpenRejectCard}
        onSave={() => handleSave()}
        cancelLabel={common.cancel}
        rejectLabel={shopsMessages.editCard.rejectSubmit}
        saveLabel={common.save}
        savingLabel={common.saving}
      />

      <RejectDialog
        open={rejectState.open}
        onClose={() => setRejectState(getEmptyRejectState())}
        title={shopsMessages.editCard.rejectTitle}
        name={shopData?.name ?? ""}
        url={shopData?.url ?? ""}
        adminNote={rejectState.reason}
        onAdminNoteChange={(value) => setRejectState((current) => ({ ...current, reason: value }))}
        onAdminNotePaste={handleRejectPaste}
        rejectionLongText={rejectState.longText}
        onRejectionLongTextChange={(value) =>
          setRejectState((current) => ({ ...current, longText: value }))
        }
        onSubmit={handleReject}
        isPending={isRejecting}
        isError={setVisibilityMutation.isError}
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
    </>
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
          ) : (
            <span className="text-xl font-bold text-[var(--ds-text-subtle)] select-none">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="block text-xs font-medium text-[var(--ds-text-muted)] mb-1">
            {previewImageLabel}
          </p>
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
          {setImageLabel}
        </button>
      </div>
    </div>
  );
}

interface ShopEditFooterProps {
  canReject: boolean;
  canSave: boolean;
  isPending: boolean;
  onClose: () => void;
  onOpenRejectCard: () => void;
  onSave: () => void;
  cancelLabel: string;
  rejectLabel: string;
  saveLabel: string;
  savingLabel: string;
}

function ShopEditFooter({
  canReject,
  canSave,
  isPending,
  onClose,
  onOpenRejectCard,
  onSave,
  cancelLabel,
  rejectLabel,
  saveLabel,
  savingLabel,
}: ShopEditFooterProps) {
  return (
    <OverlayCard.Footer className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="py-1.5 px-4 border border-[var(--ds-border)] text-[var(--ds-text-muted)] rounded-control text-sm hover:border-[var(--ds-border-strong)] transition-colors"
      >
        {cancelLabel}
      </button>
      {canReject && (
        <button
          type="button"
          onClick={onOpenRejectCard}
          className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
        >
          <SFXmarkCircleFill className="w-3.5 h-3.5" />
          {rejectLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors disabled:opacity-40"
      >
        <SFSquareAndArrowDownFill className="w-3.5 h-3.5" />
        {isPending ? savingLabel : saveLabel}
      </button>
    </OverlayCard.Footer>
  );
}
