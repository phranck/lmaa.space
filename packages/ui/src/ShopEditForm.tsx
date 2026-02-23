import type { ReactNode } from "react";
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
    ? "block text-xs font-medium text-gray-600 mb-1"
    : "block text-sm font-medium text-stone-700 mb-1.5";

  const inputClass = isDashboard
    ? "w-full px-3 py-2 border border-gray-200 rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
        <input
          id="sef-url"
          type="url"
          value={value.url}
          onChange={(e) => set("url", e.target.value)}
          onBlur={() => onUrlBlur?.(value.url)}
          placeholder="https://…"
          className={`${inputClass}${errors?.url ? " border-red-400" : ""}`}
        />
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
