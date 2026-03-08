import type { ReactNode } from "react";
import SFArrowUpRight from "sf-symbols-lib/monochrome/SFArrowUpRight";

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
  messages: ShopEditFormMessages;
  errors?: Partial<Record<keyof ShopEditFormValue, string>>;
  onUrlBlur?: (url: string) => void;
  urlWarning?: ReactNode;
  descriptionHint?: ReactNode;
}

/**
 * Shared, message-driven shop form used in both dashboard moderation and public suggestion flows.
 */
export function ShopEditForm({
  value,
  onChange,
  categories,
  regionOptions,
  messages,
  errors,
  onUrlBlur,
  urlWarning,
  descriptionHint,
}: ShopEditFormProps) {
  function set<K extends keyof ShopEditFormValue>(key: K, val: ShopEditFormValue[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Name + URL */}
      <div className="grid grid-cols-2 gap-4">
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
              <SFArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          {errors?.url && <FormErrorText>{errors.url}</FormErrorText>}
          {urlWarning}
        </div>
      </div>

      {/* Contact Email + Social Media */}
      <div className="grid grid-cols-[2fr_3fr] gap-4">
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
            />
            {errors?.socialMedia && <FormErrorText>{errors.socialMedia}</FormErrorText>}
          </div>
        )}
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
