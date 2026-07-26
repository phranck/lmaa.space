import {
  ArrowSquareOutIcon,
  CreditCardIcon,
  CrosshairIcon,
  MapPinIcon,
  MarkdownLogoIcon,
  NotePencilIcon,
  ShareNetworkIcon,
  SpinnerIcon,
  StorefrontIcon,
  TagIcon,
  TruckIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import type { ReactNode } from "react";

import type { ShopCheckNotes } from "@lmaa/shared";

import { AlertDialog } from "./AlertDialog.tsx";
import type { CountryCodeOption } from "./CountryCodeOptions.ts";
import { CountryCodeSelect } from "./CountryCodeSelect.tsx";
import { DashboardSection } from "./DashboardSection.tsx";
import { InputPrimitive, TextareaPrimitive } from "./FieldPrimitives.tsx";
import {
  FormErrorText,
  FormHelpText,
  FormLabel,
  FormLabelText,
  FormOptional,
} from "./FormPrimitives.tsx";
import { MarkdownEditor } from "./MarkdownEditor.tsx";
import { MultiSelect, type MultiSelectMessages } from "./MultiSelect.tsx";
import {
  PaymentMethodsEditor,
  type PaymentMethodsEditorMessages,
} from "./PaymentMethodsEditor.tsx";
import type { RegionSelectOption } from "./RegionOptions.ts";
import { RegionSelect, type RegionSelectMessages } from "./RegionSelect.tsx";
import type { ShopEditFormValue } from "./ShopEditFormModel.ts";
import { SocialMediaEditor, type SocialMediaEditorMessages } from "./SocialMediaEditor.tsx";

/**
 * Canonical value model used by the shared shop edit form.
 */
/**
 * Localizable UI copy contract for the shared shop edit form.
 */
export interface ShopEditFormMessages {
  shopDataSectionLabel: string;
  nameLabel: string;
  urlLabel: string;
  urlPlaceholder: string;
  openUrlAriaLabel: string;
  descriptionLabel: string;
  optionalLabel: string;
  markdownSupportedLabel: string;
  categoriesLabel: string;
  categoriesPlaceholder: string;
  shippingSectionLabel: string;
  shippingLabel: string;
  shippingPlaceholder: string;
  contactEmailLabel: string;
  contactEmailPlaceholder: string;
  headquartersLabel: string;
  streetLabel: string;
  streetPlaceholder: string;
  postalCodeLabel: string;
  postalCodePlaceholder: string;
  cityLabel: string;
  cityPlaceholder: string;
  countryCodeLabel: string;
  countryCodePlaceholder: string;
  latitudeLabel: string;
  latitudePlaceholder: string;
  longitudeLabel: string;
  longitudePlaceholder: string;
  geocodeButtonLabel?: string;
  geocodingErrorTitle?: string;
  geocodingNoResultsLabel?: string;
  geocodingFetchErrorLabel?: string;
  jsonToolTitle?: string;
  jsonApplyLabel?: string;
  jsonImportFileLabel?: string;
  jsonImportError?: string;
  jsonInvalidError?: string;
  mapStandardLabel?: string;
  mapSatelliteLabel?: string;
  regionSelect: RegionSelectMessages;
  categorySelect: MultiSelectMessages;
  paymentMethodsLabel: string;
  paymentMethods: PaymentMethodsEditorMessages;
  socialMediaLabel?: string;
  socialMedia?: SocialMediaEditorMessages;
  shopCheckNotesSectionLabel: string;
  shopCheckFocusLabel: string;
  shopCheckFocusPlaceholder: string;
  shopCheckCompanyPresentationLabel: string;
  shopCheckCompanyPresentationPlaceholder: string;
  shopCheckBrandsSectionLabel: string;
  shopCheckBrandsLabel: string;
  shopCheckBrandsPlaceholder: string;
  shopCheckListHelpLabel: string;
}

/**
 * Props for the shared shop edit form component.
 */
export interface ShopEditFormProps {
  value: ShopEditFormValue;
  onChange: (value: ShopEditFormValue) => void;
  categories: { id: number; name: string }[];
  regionOptions: ReadonlyArray<RegionSelectOption>;
  countryCodeOptions: ReadonlyArray<CountryCodeOption>;
  messages: ShopEditFormMessages;
  errors?: Partial<Record<keyof ShopEditFormValue, string>>;
  onUrlBlur?: (url: string) => void;
  urlWarning?: ReactNode;
  descriptionHint?: ReactNode;
  blurSocialMediaOnPaste?: boolean;
  previewAside?: ReactNode;
  topAside?: ReactNode;
  detailsAside?: ReactNode;
  descriptionAside?: ReactNode;
}

/**
 * Shared, message-driven shop form used in both dashboard moderation and public suggestion flows.
 */
export function ShopEditForm({
  value,
  onChange,
  categories,
  regionOptions,
  countryCodeOptions,
  messages,
  errors,
  onUrlBlur,
  urlWarning,
  descriptionHint,
  blurSocialMediaOnPaste = false,
  previewAside,
  topAside,
  detailsAside,
  descriptionAside,
}: ShopEditFormProps) {
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeErrorMessage, setGeocodeErrorMessage] = useState<string | null>(null);

  function set<K extends keyof ShopEditFormValue>(key: K, val: ShopEditFormValue[K]) {
    onChange({ ...value, [key]: val });
  }

  function setShopCheckNotesField<K extends keyof ShopCheckNotes>(
    key: K,
    fieldValue: ShopCheckNotes[K],
  ) {
    set(
      "shopCheckNotes",
      normalizeShopCheckNotes({
        ...(value.shopCheckNotes ?? {}),
        [key]: fieldValue,
      }),
    );
  }

  async function handleGeocode() {
    const address = [
      value.headquartersStreet,
      value.headquartersPostalCode,
      value.headquartersCity,
      value.headquartersCountryCode,
    ]
      .filter(Boolean)
      .join(", ");
    if (!address) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`,
      );
      const data = (await res.json()) as {
        features?: { geometry: { coordinates: [number, number] } }[];
      };
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].geometry.coordinates;
        onChange({
          ...value,
          headquartersLatitude: String(lat),
          headquartersLongitude: String(lng),
        });
      } else {
        setGeocodeErrorMessage(
          messages.geocodingNoResultsLabel ??
            "Für die eingegebene Adresse konnten keine Koordinaten gefunden werden.",
        );
      }
    } catch {
      setGeocodeErrorMessage(
        messages.geocodingFetchErrorLabel ??
          "Die Geocoding-Anfrage ist fehlgeschlagen. Bitte versuche es erneut.",
      );
    } finally {
      setGeocoding(false);
    }
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* ── Left column (4 of 12) ─────────────────────────────── */}
      <div className="col-span-4 flex flex-col gap-4">
        {/* Shop Data: Name, URL, Email, Categories */}
        <DashboardSection>
          <DashboardSection.Header
            icon={<StorefrontIcon weight="duotone" className="size-4" />}
            title={messages.shopDataSectionLabel}
          />
          <DashboardSection.Body>
            {/* Name */}
            <div>
              <FormLabel htmlFor="sef-name">{messages.nameLabel}</FormLabel>
              <InputPrimitive
                id="sef-name"
                value={value.name}
                onChange={(e) => set("name", e.target.value)}
                invalid={Boolean(errors?.name)}
              />
              {errors?.name && <FormErrorText>{errors.name}</FormErrorText>}
            </div>

            {/* URL */}
            <div>
              <FormLabel htmlFor="sef-url">{messages.urlLabel}</FormLabel>
              <div className="flex gap-2">
                <InputPrimitive
                  id="sef-url"
                  type="url"
                  value={value.url}
                  onChange={(e) => set("url", e.target.value)}
                  onBlur={() => onUrlBlur?.(value.url)}
                  placeholder={messages.urlPlaceholder}
                  className="flex-1"
                  invalid={Boolean(errors?.url)}
                />
                <a
                  href={value.url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={messages.openUrlAriaLabel}
                  title={messages.openUrlAriaLabel}
                  tabIndex={value.url ? 0 : -1}
                  className={`shrink-0 flex items-center justify-center w-9 border rounded-control transition-colors ${
                    value.url
                      ? "border-[var(--ds-border)] text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)] hover:bg-[var(--ds-bg-elevated)]"
                      : "border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-[var(--ds-text-subtle)] pointer-events-none"
                  }`}
                >
                  <ArrowSquareOutIcon weight="duotone" className="size-4" />
                </a>
              </div>
              {errors?.url && <FormErrorText>{errors.url}</FormErrorText>}
              {urlWarning}
            </div>

            {/* Contact Email */}
            <div>
              <FormLabel htmlFor="sef-contact-email">
                <span className="flex items-center gap-1.5">
                  {messages.contactEmailLabel} <FormOptional>{messages.optionalLabel}</FormOptional>
                </span>
              </FormLabel>
              <InputPrimitive
                id="sef-contact-email"
                type="email"
                value={value.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                placeholder={messages.contactEmailPlaceholder}
                invalid={Boolean(errors?.contactEmail)}
              />
              {errors?.contactEmail && <FormErrorText>{errors.contactEmail}</FormErrorText>}
            </div>

            {/* Categories */}
            <div>
              <FormLabelText>{messages.categoriesLabel}</FormLabelText>
              <MultiSelect
                options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                value={value.categoryIds.map(String)}
                onValueChange={(vals) => set("categoryIds", vals.map(Number))}
                placeholder={messages.categoriesPlaceholder}
                messages={messages.categorySelect}
                error={errors?.categoryIds}
                className="-mt-px"
              />
            </div>
          </DashboardSection.Body>
        </DashboardSection>

        {/* Headquarters + Geo */}
        <DashboardSection>
          <DashboardSection.Header
            icon={<MapPinIcon weight="duotone" className="size-4" />}
            title={messages.headquartersLabel}
          />
          <DashboardSection.Body>
            <div>
              <FormLabel htmlFor="sef-hq-street">{messages.streetLabel}</FormLabel>
              <InputPrimitive
                id="sef-hq-street"
                value={value.headquartersStreet}
                onChange={(e) => set("headquartersStreet", e.target.value)}
                placeholder={messages.streetPlaceholder}
                invalid={Boolean(errors?.headquartersStreet)}
              />
              {errors?.headquartersStreet && (
                <FormErrorText>{errors.headquartersStreet}</FormErrorText>
              )}
            </div>

            {/* CC (1sp) + PLZ (1sp) + City (2sp) */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1">
                <CountryCodeSelect
                  label={messages.countryCodeLabel}
                  value={value.headquartersCountryCode}
                  onChange={(code) => set("headquartersCountryCode", code)}
                  options={countryCodeOptions}
                  placeholder={messages.countryCodePlaceholder}
                  error={errors?.headquartersCountryCode}
                />
              </div>
              <div className="col-span-1">
                <FormLabel htmlFor="sef-hq-postal-code">{messages.postalCodeLabel}</FormLabel>
                <InputPrimitive
                  id="sef-hq-postal-code"
                  value={value.headquartersPostalCode}
                  onChange={(e) => set("headquartersPostalCode", e.target.value)}
                  placeholder={messages.postalCodePlaceholder}
                  invalid={Boolean(errors?.headquartersPostalCode)}
                />
                {errors?.headquartersPostalCode && (
                  <FormErrorText>{errors.headquartersPostalCode}</FormErrorText>
                )}
              </div>
              <div className="col-span-2">
                <FormLabel htmlFor="sef-hq-city">{messages.cityLabel}</FormLabel>
                <InputPrimitive
                  id="sef-hq-city"
                  value={value.headquartersCity}
                  onChange={(e) => set("headquartersCity", e.target.value)}
                  placeholder={messages.cityPlaceholder}
                  invalid={Boolean(errors?.headquartersCity)}
                />
                {errors?.headquartersCity && (
                  <FormErrorText>{errors.headquartersCity}</FormErrorText>
                )}
              </div>
            </div>

            {/* Lat (3sp) + Lng (3sp) + Geocode-Button (2sp) */}
            <div className="grid grid-cols-8 gap-4">
              <div className="col-span-3">
                <FormLabel htmlFor="sef-hq-lat">{messages.latitudeLabel}</FormLabel>
                <InputPrimitive
                  id="sef-hq-lat"
                  inputMode="decimal"
                  value={value.headquartersLatitude}
                  onChange={(e) => set("headquartersLatitude", e.target.value)}
                  placeholder={messages.latitudePlaceholder}
                  invalid={Boolean(errors?.headquartersLatitude)}
                />
                {errors?.headquartersLatitude && (
                  <FormErrorText>{errors.headquartersLatitude}</FormErrorText>
                )}
              </div>
              <div className="col-span-3">
                <FormLabel htmlFor="sef-hq-lng">{messages.longitudeLabel}</FormLabel>
                <InputPrimitive
                  id="sef-hq-lng"
                  inputMode="decimal"
                  value={value.headquartersLongitude}
                  onChange={(e) => set("headquartersLongitude", e.target.value)}
                  placeholder={messages.longitudePlaceholder}
                  invalid={Boolean(errors?.headquartersLongitude)}
                />
                {errors?.headquartersLongitude && (
                  <FormErrorText>{errors.headquartersLongitude}</FormErrorText>
                )}
              </div>
              <div className="col-span-2 flex flex-col">
                <FormLabel className="invisible" aria-hidden="true">
                  &nbsp;
                </FormLabel>
                <button
                  type="button"
                  aria-label={messages.geocodeButtonLabel ?? "Geo-Koordinaten ermitteln"}
                  onClick={handleGeocode}
                  disabled={geocoding}
                  title={messages.geocodeButtonLabel ?? "Geo-Koordinaten ermitteln"}
                  className="w-full flex-1 flex items-center justify-center gap-1.5 px-3 border border-[var(--ds-border)] rounded-control text-sm font-medium text-[var(--ds-text-muted)] bg-[var(--ds-bg-elevated)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)] hover:bg-[var(--ds-bg-hover)] transition-colors disabled:opacity-40"
                >
                  {geocoding ? (
                    <SpinnerIcon className="size-4 animate-spin" />
                  ) : (
                    <CrosshairIcon weight="duotone" className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </DashboardSection.Body>
        </DashboardSection>

        {/* Shipping Region + Note */}
        <DashboardSection>
          <DashboardSection.Header
            icon={<TruckIcon weight="duotone" className="size-4" />}
            title={messages.shippingSectionLabel}
          />
          <DashboardSection.Body>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <RegionSelect
                  value={value.region}
                  onChange={(v) => set("region", v)}
                  options={regionOptions}
                  messages={messages.regionSelect}
                  error={errors?.region}
                  variant="dashboard"
                />
              </div>
              <div className="col-span-2">
                <FormLabel htmlFor="sef-shipping">{messages.shippingLabel}</FormLabel>
                <InputPrimitive
                  id="sef-shipping"
                  value={value.shipping}
                  onChange={(e) => set("shipping", e.target.value)}
                  placeholder={messages.shippingPlaceholder}
                  invalid={Boolean(errors?.shipping)}
                />
                {errors?.shipping && <FormErrorText>{errors.shipping}</FormErrorText>}
              </div>
            </div>
          </DashboardSection.Body>
        </DashboardSection>

        <DashboardSection>
          <DashboardSection.Header
            icon={<CreditCardIcon weight="duotone" className="size-4" />}
            title={messages.paymentMethodsLabel}
          />
          <DashboardSection.Body>
            <PaymentMethodsEditor
              value={value.paymentMethods}
              onChange={(nextValue) => set("paymentMethods", nextValue)}
              messages={messages.paymentMethods}
              error={errors?.paymentMethods}
            />
          </DashboardSection.Body>
        </DashboardSection>

        {/* Social Media */}
        {messages.socialMediaLabel && messages.socialMedia && (
          <DashboardSection>
            <DashboardSection.Header
              icon={<ShareNetworkIcon weight="duotone" className="size-4" />}
              title={messages.socialMediaLabel}
            />
            <DashboardSection.Body>
              <SocialMediaEditor
                value={value.socialMedia}
                onChange={(v) => set("socialMedia", v)}
                messages={messages.socialMedia}
                blurOnPaste={blurSocialMediaOnPaste}
              />
              {errors?.socialMedia && <FormErrorText>{errors.socialMedia}</FormErrorText>}
            </DashboardSection.Body>
          </DashboardSection>
        )}

        <DashboardSection>
          <DashboardSection.Header
            icon={<NotePencilIcon weight="duotone" className="size-4" />}
            title={messages.shopCheckNotesSectionLabel}
          />
          <DashboardSection.Body>
            <ShopCheckListTextarea
              id="sef-shop-check-focus"
              label={messages.shopCheckFocusLabel}
              value={value.shopCheckNotes?.focus}
              onValueChange={(nextValue) => setShopCheckNotesField("focus", nextValue)}
              placeholder={messages.shopCheckFocusPlaceholder}
              helpLabel={messages.shopCheckListHelpLabel}
              rows={4}
            />

            <div>
              <FormLabel htmlFor="sef-shop-check-company-presentation">
                {messages.shopCheckCompanyPresentationLabel}
              </FormLabel>
              <TextareaPrimitive
                id="sef-shop-check-company-presentation"
                value={value.shopCheckNotes?.companyPresentation ?? ""}
                onChange={(e) =>
                  setShopCheckNotesField(
                    "companyPresentation",
                    e.target.value.trim() === "" ? null : e.target.value,
                  )
                }
                placeholder={messages.shopCheckCompanyPresentationPlaceholder}
                rows={4}
              />
            </div>

            {errors?.shopCheckNotes && <FormErrorText>{errors.shopCheckNotes}</FormErrorText>}
          </DashboardSection.Body>
        </DashboardSection>

        <DashboardSection>
          <DashboardSection.Header
            icon={<TagIcon weight="duotone" className="size-4" />}
            title={messages.shopCheckBrandsSectionLabel}
          />
          <DashboardSection.Body>
            <ShopCheckListTextarea
              id="sef-shop-check-brands"
              label={messages.shopCheckBrandsLabel}
              value={value.shopCheckNotes?.brandsOrProducts}
              onValueChange={(nextValue) => setShopCheckNotesField("brandsOrProducts", nextValue)}
              placeholder={messages.shopCheckBrandsPlaceholder}
              helpLabel={messages.shopCheckListHelpLabel}
              rows={5}
            />
          </DashboardSection.Body>
        </DashboardSection>

        {descriptionAside && <div>{descriptionAside}</div>}
      </div>

      <AlertDialog
        open={geocodeErrorMessage !== null}
        variant="error"
        title={messages.geocodingErrorTitle ?? "Geocoding fehlgeschlagen"}
        onClose={() => setGeocodeErrorMessage(null)}
      >
        {geocodeErrorMessage}
      </AlertDialog>

      {/* ── Right column (8 of 12) ─────────────────────────────── */}
      <div className="col-span-8 flex flex-col gap-4 min-w-0">
        {previewAside}
        {topAside && <div className="min-w-0">{topAside}</div>}

        {detailsAside && <div className="min-h-80">{detailsAside}</div>}

        {/* Description (MarkdownEditor) */}
        <DashboardSection>
          <DashboardSection.Header
            icon={<MarkdownLogoIcon weight="duotone" className="size-4" />}
            title={messages.descriptionLabel}
          />
          <DashboardSection.Body className="!p-0 min-h-[24rem]">
            <MarkdownEditor
              id="sef-description"
              value={value.description}
              onChange={(v) => set("description", v)}
              rows={15}
              resizable
              className={`!border-0 !rounded-none !rounded-b-xl flex-1 ${errors?.description ? "border-red-400" : ""}`}
            />
            {errors?.description && (
              <FormErrorText className="px-4 pb-3">{errors.description}</FormErrorText>
            )}
            {descriptionHint}
          </DashboardSection.Body>
        </DashboardSection>
      </div>
    </div>
  );
}

interface ShopCheckListTextareaProps {
  id: string;
  label: string;
  value: string[] | undefined;
  onValueChange: (value: string[] | undefined) => void;
  placeholder: string;
  helpLabel: string;
  rows: number;
}

function ShopCheckListTextarea({
  id,
  label,
  value,
  onValueChange,
  placeholder,
  helpLabel,
  rows,
}: ShopCheckListTextareaProps) {
  const externalValue = formatTextareaList(value);
  const [draftState, setDraftState] = useState(() => ({
    draftValue: externalValue,
    synchronizedValue: externalValue,
  }));
  const draftValue =
    draftState.synchronizedValue === externalValue ? draftState.draftValue : externalValue;

  function handleDraftChange(nextDraftValue: string) {
    const nextValue = parseTextareaList(nextDraftValue);
    setDraftState({
      draftValue: nextDraftValue,
      synchronizedValue: formatTextareaList(nextValue),
    });
    onValueChange(nextValue);
  }

  function handleDraftBlur() {
    const nextValue = parseTextareaList(draftValue);
    const normalizedValue = formatTextareaList(nextValue);
    setDraftState({
      draftValue: normalizedValue,
      synchronizedValue: normalizedValue,
    });
    onValueChange(nextValue);
  }

  return (
    <div>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <TextareaPrimitive
        id={id}
        value={draftValue}
        onChange={(event) => handleDraftChange(event.target.value)}
        onBlur={handleDraftBlur}
        placeholder={placeholder}
        rows={rows}
      />
      <FormHelpText>{helpLabel}</FormHelpText>
    </div>
  );
}

function formatTextareaList(values: string[] | undefined) {
  return values?.join("\n") ?? "";
}

function parseTextareaList(value: string): string[] | undefined {
  const entries = value.split(/\r?\n/).flatMap((entry) => {
    const trimmedEntry = entry.trim();
    return trimmedEntry ? [trimmedEntry] : [];
  });

  return entries.length > 0 ? Array.from(new Set(entries)) : undefined;
}

function normalizeShopCheckNotes(notes: ShopCheckNotes): ShopCheckNotes | null {
  const next: ShopCheckNotes = {};

  if (notes.focus && notes.focus.length > 0) {
    next.focus = notes.focus;
  }

  if (notes.brandsOrProducts && notes.brandsOrProducts.length > 0) {
    next.brandsOrProducts = notes.brandsOrProducts;
  }

  if (typeof notes.companyPresentation === "string" && notes.companyPresentation.trim() !== "") {
    next.companyPresentation = notes.companyPresentation.trim();
  }

  return Object.keys(next).length > 0 ? next : null;
}
