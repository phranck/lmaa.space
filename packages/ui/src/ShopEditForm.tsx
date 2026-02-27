import type { ReactNode } from "react";
import { LuExternalLink } from "react-icons/lu";
import { SiMarkdown } from "react-icons/si";
import { MultiSelect, type MultiSelectMessages } from "./MultiSelect.tsx";
import {
  RegionSelect,
  type RegionSelectMessages,
  type RegionSelectOption,
} from "./RegionSelect.tsx";

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
  regionSelect: RegionSelectMessages;
  categorySelect: MultiSelectMessages;
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
  variant: "dashboard" | "frontend";
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
  variant,
  onUrlBlur,
  urlWarning,
  descriptionHint,
}: ShopEditFormProps) {
  const isDashboard = variant === "dashboard";

  const labelClass = isDashboard
    ? "block text-xs font-medium text-[var(--ds-text-muted)] mb-1"
    : "block text-sm font-medium text-stone-700 mb-1.5";

  const inputClass =
    "w-full px-3 py-2 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

  const gapClass = isDashboard ? "flex flex-col gap-4" : "flex flex-col gap-5";

  function set<K extends keyof ShopEditFormValue>(key: K, val: ShopEditFormValue[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className={gapClass}>
      {/* Name */}
      <div>
        <label htmlFor="sef-name" className={labelClass}>
          {messages.nameLabel}
        </label>
        <input
          id="sef-name"
          type="text"
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          className={`${inputClass}${errors?.name ? " border-red-400" : ""}`}
        />
        {errors?.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* URL */}
      <div>
        <label htmlFor="sef-url" className={labelClass}>
          {messages.urlLabel}
        </label>
        <div className="flex gap-2">
          <input
            id="sef-url"
            type="url"
            value={value.url}
            onChange={(e) => set("url", e.target.value)}
            onBlur={() => onUrlBlur?.(value.url)}
            placeholder={messages.urlPlaceholder}
            className={`flex-1 ${inputClass}${errors?.url ? " border-red-400" : ""}`}
          />
          <a
            href={value.url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={messages.openUrlAriaLabel}
            tabIndex={value.url ? 0 : -1}
            className={`shrink-0 flex items-center justify-center w-9 border rounded-control transition-colors ${
              value.url
                ? "border-[var(--ds-border)] text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)] hover:bg-[var(--ds-bg-elevated)]"
                : "border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-[var(--ds-text-subtle)] pointer-events-none"
            }`}
          >
            <LuExternalLink size={14} />
          </a>
        </div>
        {errors?.url && <p className="text-red-500 text-xs mt-1">{errors.url}</p>}
        {urlWarning}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="sef-description" className={labelClass}>
          <span className="flex items-center gap-1.5">
            {messages.descriptionLabel}{" "}
            <span className="text-[var(--ds-text-subtle)] font-normal">
              {messages.optionalLabel}
            </span>
            <SiMarkdown className="w-5 h-5 opacity-40" title={messages.markdownSupportedLabel} />
          </span>
        </label>
        <textarea
          id="sef-description"
          value={value.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          maxLength={2000}
          className={`${inputClass} resize-none${errors?.description ? " border-red-400" : ""}`}
        />
        {errors?.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
        {descriptionHint}
      </div>

      {/* Categories */}
      <div>
        <p className={labelClass}>{messages.categoriesLabel}</p>
        <MultiSelect
          options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
          value={value.categoryIds.map(String)}
          onValueChange={(vals) => set("categoryIds", vals.map(Number))}
          placeholder={messages.categoriesPlaceholder}
          messages={messages.categorySelect}
          error={errors?.categoryIds}
        />
      </div>

      {/* Region */}
      <RegionSelect
        value={value.region}
        onChange={(v) => set("region", v)}
        options={regionOptions}
        messages={messages.regionSelect}
        error={errors?.region}
        variant={variant}
      />

      {/* Shipping */}
      <div>
        <label htmlFor="sef-shipping" className={labelClass}>
          {messages.shippingLabel}
        </label>
        <input
          id="sef-shipping"
          type="text"
          value={value.shipping}
          onChange={(e) => set("shipping", e.target.value)}
          placeholder={messages.shippingPlaceholder}
          className={`${inputClass}${errors?.shipping ? " border-red-400" : ""}`}
        />
        {errors?.shipping && <p className="text-red-500 text-xs mt-1">{errors.shipping}</p>}
      </div>
    </div>
  );
}
