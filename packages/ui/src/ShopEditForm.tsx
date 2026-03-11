import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import type { ShopCheckNotes } from "@lmaa/shared";

import { CountryCodeSelect, type CountryCodeOption } from "./CountryCodeSelect.tsx";
import {
  FormErrorText,
  FormLabel,
  FormLabelText,
  FormOptional,
  formInputClass,
} from "./FormPrimitives.tsx";
import { MarkdownEditor } from "./MarkdownEditor.tsx";
import { MultiSelect, type MultiSelectMessages } from "./MultiSelect.tsx";
import {
  RegionSelect,
  type RegionSelectMessages,
  type RegionSelectOption,
} from "./RegionSelect.tsx";
import { SocialMediaEditor, type SocialMediaEditorMessages } from "./SocialMediaEditor.tsx";

/**
 * Canonical value model used by the shared shop edit form.
 */
export interface ShopEditFormValue {
  name: string;
  url: string;
  description: string;
  categoryIds: number[];
  region: string[];
  shipping: string;
  contactEmail: string;
  socialMedia: Record<string, string>;
  shopCheckNotes: ShopCheckNotes | null;
  headquartersStreet: string;
  headquartersPostalCode: string;
  headquartersCity: string;
  headquartersState: string;
  headquartersCountryCode: string;
  headquartersLatitude: string;
  headquartersLongitude: string;
}

/**
 * Empty initial state for shop creation/edit flows.
 */
export const EMPTY_SHOP_FORM_VALUE: ShopEditFormValue = {
  name: "",
  url: "",
  description: "",
  categoryIds: [],
  region: [],
  shipping: "",
  contactEmail: "",
  socialMedia: {},
  shopCheckNotes: null,
  headquartersStreet: "",
  headquartersPostalCode: "",
  headquartersCity: "",
  headquartersState: "",
  headquartersCountryCode: "",
  headquartersLatitude: "",
  headquartersLongitude: "",
};

/**
 * Localizable UI copy contract for the shared shop edit form.
 */
export interface ShopEditFormMessages {
  nameLabel: string;
  urlLabel: string;
  urlPlaceholder: string;
  openUrlAriaLabel: string;
  descriptionLabel: string;
  optionalLabel: string;
  markdownSupportedLabel: string;
  categoriesLabel: string;
  categoriesPlaceholder: string;
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
  jsonToolTitle?: string;
  jsonApplyLabel?: string;
  jsonImportError?: string;
  jsonInvalidError?: string;
  mapStandardLabel?: string;
  mapSatelliteLabel?: string;
  regionSelect: RegionSelectMessages;
  categorySelect: MultiSelectMessages;
  socialMediaLabel?: string;
  socialMedia?: SocialMediaEditorMessages;
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
  onSocialMediaValidationChange?: (message: string | null) => void;
  topAside?: ReactNode;
  detailsAside?: ReactNode;
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
  onSocialMediaValidationChange,
  topAside,
  detailsAside,
}: ShopEditFormProps) {
  function set<K extends keyof ShopEditFormValue>(key: K, val: ShopEditFormValue[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Name + URL + top aside tool */}
      <div className="grid grid-cols-[1.2fr_1.8fr] gap-4">
        <div className="flex flex-col gap-4">
          <div>
            <FormLabel htmlFor="sef-name">{messages.nameLabel}</FormLabel>
            <input
              id="sef-name"
              type="text"
              value={value.name}
              onChange={(e) => set("name", e.target.value)}
              className={`${formInputClass}${errors?.name ? " border-red-400" : ""}`}
            />
            {errors?.name && <FormErrorText>{errors.name}</FormErrorText>}
          </div>

          <div>
            <FormLabel htmlFor="sef-url">{messages.urlLabel}</FormLabel>
            <div className="flex gap-2">
              <input
                id="sef-url"
                type="url"
                value={value.url}
                onChange={(e) => set("url", e.target.value)}
                onBlur={() => onUrlBlur?.(value.url)}
                placeholder={messages.urlPlaceholder}
                className={`flex-1 ${formInputClass}${errors?.url ? " border-red-400" : ""}`}
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
                <ArrowSquareOutIcon weight="duotone" className="w-4 h-4" />
              </a>
            </div>
            {errors?.url && <FormErrorText>{errors.url}</FormErrorText>}
            {urlWarning}
          </div>

          <div>
            <FormLabel htmlFor="sef-contact-email">
              <span className="flex items-center gap-1.5">
                {messages.contactEmailLabel} <FormOptional>{messages.optionalLabel}</FormOptional>
              </span>
            </FormLabel>
            <input
              id="sef-contact-email"
              type="email"
              value={value.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
              placeholder={messages.contactEmailPlaceholder}
              className={`${formInputClass}${errors?.contactEmail ? " border-red-400" : ""}`}
            />
            {errors?.contactEmail && <FormErrorText>{errors.contactEmail}</FormErrorText>}
          </div>
        </div>

        <div className="min-w-0">{topAside}</div>
      </div>

      <div className="grid grid-cols-[1.2fr_1.8fr] gap-4">
        <div className="flex flex-col gap-4">
          {/* Social Media */}
          {messages.socialMediaLabel && messages.socialMedia && (
            <div>
              <FormLabelText>
                <span className="flex items-center gap-1.5">
                  {messages.socialMediaLabel} <FormOptional>{messages.optionalLabel}</FormOptional>
                </span>
              </FormLabelText>
              <SocialMediaEditor
                value={value.socialMedia}
                onChange={(v) => set("socialMedia", v)}
                messages={messages.socialMedia}
                blurOnPaste={blurSocialMediaOnPaste}
                onValidationChange={onSocialMediaValidationChange}
              />
              {errors?.socialMedia && <FormErrorText>{errors.socialMedia}</FormErrorText>}
            </div>
          )}

          {/* Headquarters + Geo */}
          <div className="flex flex-col gap-4">
            <FormLabelText>
              <span className="flex items-center gap-1.5">
                {messages.headquartersLabel} <FormOptional>{messages.optionalLabel}</FormOptional>
              </span>
            </FormLabelText>

            <div>
              <FormLabel htmlFor="sef-hq-street">{messages.streetLabel}</FormLabel>
              <input
                id="sef-hq-street"
                type="text"
                value={value.headquartersStreet}
                onChange={(e) => set("headquartersStreet", e.target.value)}
                placeholder={messages.streetPlaceholder}
                className={`${formInputClass}${errors?.headquartersStreet ? " border-red-400" : ""}`}
              />
              {errors?.headquartersStreet && (
                <FormErrorText>{errors.headquartersStreet}</FormErrorText>
              )}
            </div>

            <div className="grid grid-cols-[140px_1fr_1.25fr] gap-4">
              <div>
                <CountryCodeSelect
                  label={messages.countryCodeLabel}
                  value={value.headquartersCountryCode}
                  onChange={(code) => set("headquartersCountryCode", code)}
                  options={countryCodeOptions}
                  placeholder={messages.countryCodePlaceholder}
                  error={errors?.headquartersCountryCode}
                />
              </div>

              <div>
                <FormLabel htmlFor="sef-hq-postal-code">{messages.postalCodeLabel}</FormLabel>
                <input
                  id="sef-hq-postal-code"
                  type="text"
                  value={value.headquartersPostalCode}
                  onChange={(e) => set("headquartersPostalCode", e.target.value)}
                  placeholder={messages.postalCodePlaceholder}
                  className={`${formInputClass}${errors?.headquartersPostalCode ? " border-red-400" : ""}`}
                />
                {errors?.headquartersPostalCode && (
                  <FormErrorText>{errors.headquartersPostalCode}</FormErrorText>
                )}
              </div>

              <div>
                <FormLabel htmlFor="sef-hq-city">{messages.cityLabel}</FormLabel>
                <input
                  id="sef-hq-city"
                  type="text"
                  value={value.headquartersCity}
                  onChange={(e) => set("headquartersCity", e.target.value)}
                  placeholder={messages.cityPlaceholder}
                  className={`${formInputClass}${errors?.headquartersCity ? " border-red-400" : ""}`}
                />
                {errors?.headquartersCity && <FormErrorText>{errors.headquartersCity}</FormErrorText>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel htmlFor="sef-hq-lat">{messages.latitudeLabel}</FormLabel>
                <input
                  id="sef-hq-lat"
                  type="text"
                  inputMode="decimal"
                  value={value.headquartersLatitude}
                  onChange={(e) => set("headquartersLatitude", e.target.value)}
                  placeholder={messages.latitudePlaceholder}
                  className={`${formInputClass}${errors?.headquartersLatitude ? " border-red-400" : ""}`}
                />
                {errors?.headquartersLatitude && (
                  <FormErrorText>{errors.headquartersLatitude}</FormErrorText>
                )}
              </div>

              <div>
                <FormLabel htmlFor="sef-hq-lng">{messages.longitudeLabel}</FormLabel>
                <input
                  id="sef-hq-lng"
                  type="text"
                  inputMode="decimal"
                  value={value.headquartersLongitude}
                  onChange={(e) => set("headquartersLongitude", e.target.value)}
                  placeholder={messages.longitudePlaceholder}
                  className={`${formInputClass}${errors?.headquartersLongitude ? " border-red-400" : ""}`}
                />
                {errors?.headquartersLongitude && (
                  <FormErrorText>{errors.headquartersLongitude}</FormErrorText>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0">{detailsAside}</div>
      </div>

      {/* Description */}
      <div>
        <FormLabel htmlFor="sef-description">
          <span className="flex items-center gap-1.5">
            {messages.descriptionLabel} <FormOptional>{messages.optionalLabel}</FormOptional>
          </span>
        </FormLabel>
        <MarkdownEditor
          id="sef-description"
          value={value.description}
          onChange={(v) => set("description", v)}
          rows={6}
          resizable
          className={errors?.description ? "border-red-400" : ""}
        />
        {errors?.description && <FormErrorText>{errors.description}</FormErrorText>}
        {descriptionHint}
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
        />
      </div>

      {/* Region + Shipping */}
      <div className="grid grid-cols-2 gap-4">
        <RegionSelect
          value={value.region}
          onChange={(v) => set("region", v)}
          options={regionOptions}
          messages={messages.regionSelect}
          error={errors?.region}
          variant="dashboard"
        />

        <div>
          <FormLabel htmlFor="sef-shipping">{messages.shippingLabel}</FormLabel>
          <input
            id="sef-shipping"
            type="text"
            value={value.shipping}
            onChange={(e) => set("shipping", e.target.value)}
            placeholder={messages.shippingPlaceholder}
            className={`${formInputClass}${errors?.shipping ? " border-red-400" : ""}`}
          />
          {errors?.shipping && <FormErrorText>{errors.shipping}</FormErrorText>}
        </div>
      </div>
    </div>
  );
}
