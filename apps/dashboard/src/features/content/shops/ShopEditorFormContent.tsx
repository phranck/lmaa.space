import { BracketsCurlyIcon } from "@phosphor-icons/react";
import { Suspense, lazy, useRef, useState } from "react";

import { DashboardSection } from "@lmaa/ui/dashboard-section";
import { FormErrorText } from "@lmaa/ui/form-primitives";
import { ShopEditForm } from "@lmaa/ui/shop-edit-form";
import { ShopLocationMap } from "@lmaa/ui/shop-location-map";

const JsonEditor = lazy(() =>
  import("@lmaa/ui/json-editor").then((m) => ({ default: m.JsonEditor })),
);

import type { ShopEditorController } from "./hooks/useShopEditorController.ts";
import type { ShopCheckJsonPayload } from "./shop-editor-types.ts";
import { applyShopCheckJsonToForm, sanitizeJsonControlChars } from "./shop-editor-utils.ts";
import { ShopPreviewImageSection } from "./ShopPreviewImageSection.tsx";
import { ShopReminderSection } from "./ShopReminderSection.tsx";

export function ShopEditorFormContent({ controller }: { controller: ShopEditorController }) {
  const initialJsonRef = useRef<string | null>(null);
  const activeReviewData = controller.activeShop?.reviewData;
  if (initialJsonRef.current === null && activeReviewData) {
    initialJsonRef.current = JSON.stringify(activeReviewData, null, 2);
  }
  const [shopCheckJson, setShopCheckJson] = useState(initialJsonRef.current ?? "");
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
    logoBackgroundColor,
    onChangeLogoBackground,
    saveErrorMessage,
    ogImageInput,
    openImageLabel,
    placeholder,
    previewImageLabel,
    reloadImageLabel,
    setForm,
    setFormErrors,
    setImageLabel,
    shopFormI18n,
    shopsMessages,
    showLoadingSkeleton,
  } = controller;

  function applyShopCheckJson(jsonText: string, options?: { showErrors?: boolean }) {
    const trimmed = jsonText.trim();
    if (trimmed === "") {
      if (options?.showErrors) {
        setJsonImportError(shopFormI18n.messages.jsonInvalidError ?? "Invalid JSON.");
      }
      return false;
    }
    try {
      let parsed: ShopCheckJsonPayload;
      try {
        parsed = JSON.parse(trimmed) as ShopCheckJsonPayload;
      } catch {
        parsed = JSON.parse(sanitizeJsonControlChars(trimmed)) as ShopCheckJsonPayload;
      }
      const nextForm = applyShopCheckJsonToForm(form, parsed, categories);
      if (!nextForm) {
        if (options?.showErrors) {
          setJsonImportError(shopFormI18n.messages.jsonImportError ?? "JSON could not be mapped.");
        }
        return false;
      }
      setForm(nextForm);
      setJsonImportError(null);
      return true;
    } catch (err) {
      if (options?.showErrors) {
        const detail = err instanceof SyntaxError ? `: ${err.message}` : "";
        setJsonImportError((shopFormI18n.messages.jsonInvalidError ?? "Invalid JSON.") + detail);
      }
      return false;
    }
  }

  controller.importJsonHandlerRef.current = (jsonText: string) => {
    setShopCheckJson(jsonText);
    applyShopCheckJson(jsonText, { showErrors: true });
  };

  function handleShopCheckJsonPaste(event: ClipboardEvent) {
    const pastedText = event.clipboardData?.getData("text/plain")?.trim();
    if (!pastedText) return;
    setShopCheckJson(pastedText);
    if (applyShopCheckJson(pastedText, { showErrors: true })) {
      event.preventDefault();
    }
  }

  const previewAside = !isNew ? (
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
      openImageLabel={openImageLabel}
      placeholder={placeholder}
      previewImageLabel={previewImageLabel}
      reloadImageLabel={reloadImageLabel}
      setImageLabel={setImageLabel}
      logoBackgroundColor={logoBackgroundColor}
      onChangeLogoBackground={onChangeLogoBackground}
      logoBackgroundLabel={shopsMessages.editCard.logoBackground.label}
      logoBackgroundResetLabel={shopsMessages.editCard.logoBackground.reset}
      logoBackgroundInvalidLabel={shopsMessages.editCard.logoBackground.invalid}
    />
  ) : undefined;

  return (
    <>
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
          errors={controller.formErrors}
          categories={categories}
          countryCodeOptions={shopFormI18n.countryCodeOptions}
          regionOptions={shopFormI18n.regionOptions}
          messages={shopFormI18n.messages}
          blurSocialMediaOnPaste={controller.blurSocialMediaOnPaste}
          onSocialMediaValidationChange={(message) =>
            setFormErrors((current) => {
              const nextMessage = message ?? undefined;
              if (current.socialMedia === nextMessage) {
                return current;
              }
              return {
                ...current,
                socialMedia: nextMessage,
              };
            })
          }
          previewAside={previewAside}
          topAside={
            <DashboardSection>
              <DashboardSection.Header
                icon={<BracketsCurlyIcon weight="duotone" className="size-4" />}
                title={shopFormI18n.messages.jsonToolTitle ?? ""}
              />
              <DashboardSection.Body className="!p-0">
                <Suspense
                  fallback={
                    <div className="h-[11rem] bg-[var(--ds-input-bg)] animate-pulse rounded-b-xl" />
                  }
                >
                  <JsonEditor
                    id="shop-check-json"
                    value={shopCheckJson}
                    onChange={setShopCheckJson}
                    onPaste={handleShopCheckJsonPaste}
                    placeholder="{}"
                    height="11rem"
                    className="!border-0 !rounded-none !rounded-b-xl"
                  />
                </Suspense>
                {jsonImportError && (
                  <FormErrorText className="px-4 pb-3">{jsonImportError}</FormErrorText>
                )}
              </DashboardSection.Body>
            </DashboardSection>
          }
          detailsAside={
            <ShopLocationMap
              latitude={form.headquartersLatitude}
              longitude={form.headquartersLongitude}
              name={form.name}
              className="h-full rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)]"
            />
          }
          descriptionAside={
            !isNew &&
            !controller.isSubmissionMode &&
            typeof controller.activeShop?.id === "number" ? (
              <ShopReminderSection shopId={controller.activeShop.id} />
            ) : undefined
          }
        />
      )}

      {saveErrorMessage && (
        <div className="mt-4 rounded-control border border-[var(--ds-danger-border)] bg-[var(--ds-danger-bg)] px-3 py-2 text-sm text-[var(--ds-danger-text)]">
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
