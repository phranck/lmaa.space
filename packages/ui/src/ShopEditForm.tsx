import type { ReactNode } from "react";
import { LuExternalLink } from "react-icons/lu";
import { MultiSelect } from "./MultiSelect.tsx";
import { RegionSelect } from "./RegionSelect.tsx";

export interface ShopEditFormValue {
  name: string;
  url: string;
  description: string;
  categoryIds: number[];
  region: string[];
  shipping: string;
}

export const EMPTY_SHOP_FORM_VALUE: ShopEditFormValue = {
  name: "",
  url: "",
  description: "",
  categoryIds: [],
  region: [],
  shipping: "",
};

export interface ShopEditFormProps {
  value: ShopEditFormValue;
  onChange: (value: ShopEditFormValue) => void;
  categories: { id: number; name: string }[];
  errors?: Partial<Record<keyof ShopEditFormValue, string>>;
  variant: "dashboard" | "frontend";
  onUrlBlur?: (url: string) => void;
  urlWarning?: ReactNode;
  descriptionHint?: ReactNode;
}

export function ShopEditForm({
  value,
  onChange,
  categories,
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

  const inputClass = isDashboard
    ? "w-full px-3 py-2 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-surface)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
    : "w-full px-3 py-2.5 border border-stone-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

  const gapClass = isDashboard ? "flex flex-col gap-4" : "flex flex-col gap-5";

  function set<K extends keyof ShopEditFormValue>(key: K, val: ShopEditFormValue[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className={gapClass}>
      {/* Name */}
      <div>
        <label htmlFor="sef-name" className={labelClass}>
          Name
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
          URL
        </label>
        <div className="flex gap-2">
          <input
            id="sef-url"
            type="url"
            value={value.url}
            onChange={(e) => set("url", e.target.value)}
            onBlur={() => onUrlBlur?.(value.url)}
            placeholder="https://…"
            className={`flex-1 ${inputClass}${errors?.url ? " border-red-400" : ""}`}
          />
          <a
            href={value.url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="URL öffnen"
            tabIndex={value.url ? 0 : -1}
            className={`shrink-0 flex items-center justify-center w-9 border transition-colors ${
              isDashboard ? "rounded-control" : "rounded-xl bg-white"
            } ${
              value.url
                ? isDashboard
                  ? "border-[var(--ds-border)] text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)]"
                  : "border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700"
                : isDashboard
                  ? "border-[var(--ds-border-subtle)] text-[var(--ds-text-subtle)] pointer-events-none"
                  : "border-stone-100 text-stone-300 pointer-events-none"
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
          Beschreibung
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
        <p className={labelClass}>Kategorien</p>
        <MultiSelect
          options={categories}
          value={value.categoryIds}
          onChange={(ids) => set("categoryIds", ids)}
          placeholder="Kategorie wählen…"
          error={errors?.categoryIds}
        />
      </div>

      {/* Region */}
      <RegionSelect
        value={value.region}
        onChange={(v) => set("region", v)}
        error={errors?.region}
      />

      {/* Shipping */}
      <div>
        <label htmlFor="sef-shipping" className={labelClass}>
          Versand
        </label>
        <input
          id="sef-shipping"
          type="text"
          value={value.shipping}
          onChange={(e) => set("shipping", e.target.value)}
          placeholder="z.B. Kostenlos ab 50 €"
          className={`${inputClass}${errors?.shipping ? " border-red-400" : ""}`}
        />
        {errors?.shipping && <p className="text-red-500 text-xs mt-1">{errors.shipping}</p>}
      </div>
    </div>
  );
}
