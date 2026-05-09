import { CaretDownIcon, CaretUpIcon, SealWarningIcon, XCircleIcon } from "@phosphor-icons/react";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useController, useForm, useWatch } from "react-hook-form";

import type { FormConfig, FormField, RichTextVariant } from "@lmaa/contracts";
import type { Category } from "@lmaa/shared";
import { CharCounter } from "@lmaa/ui/char-counter";
import { createDefaultRegionOptions } from "@lmaa/ui/region-select";

import {
  fieldKey,
  type SimpleFields,
} from "@/components/islands/dynamic-form-utils";
import LazyButtonIcon from "@/components/islands/LazyButtonIcon.tsx";
import { useMarkdownHtml } from "@/hooks/useMarkdownHtml";
import { API_BASE } from "@/lib/client-api";
import { getSafeActionUrl } from "@/lib/safe-url";

const MarkdownEditor = lazy(() =>
  import("@lmaa/ui/markdown-editor").then((module) => ({
    default: module.MarkdownEditor,
  })),
);

const RegionSelect = lazy(() =>
  import("@lmaa/ui/region-select").then((module) => ({
    default: module.RegionSelect,
  })),
);

const REGION_OPTIONS = createDefaultRegionOptions("de");

const inputClass =
  "w-full px-3 h-9 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent)]";

const errorClass = "text-[var(--ds-danger-text)] text-xs mt-1";

const labelClass = "block text-sm font-medium text-[var(--ds-text)] mb-1.5 px-1";

function DynamicFormSubtext({ children }: { children: ReactNode }) {
  return <p className="text-xs text-[var(--ds-text-subtle)] mt-1.5 px-1">{children}</p>;
}

function buildValidationRules(
  field: FormField,
): Parameters<ReturnType<typeof useForm<SimpleFields>>["register"]>[1] {
  const rules: Parameters<ReturnType<typeof useForm<SimpleFields>>["register"]>[1] = {};

  if (field.required) {
    rules.required = `${field.label} ist ein Pflichtfeld`;
  }

  if (field.validation?.min !== undefined) {
    rules.minLength = {
      value: field.validation.min,
      message: `Mindestens ${field.validation.min} Zeichen erforderlich`,
    };
  }

  if (field.validation?.max !== undefined) {
    rules.maxLength = {
      value: field.validation.max,
      message: `Maximal ${field.validation.max} Zeichen erlaubt`,
    };
  }

  if (field.validation?.pattern) {
    rules.pattern = {
      value: new RegExp(field.validation.pattern),
      message: "Ungültiges Format",
    };
  }

  const effectiveType = field.inputType ?? field.type;
  if (effectiveType === "email" && !rules.pattern) {
    rules.pattern = {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Bitte eine gültige E-Mail-Adresse eingeben",
    };
  }
  if (effectiveType === "url" && !rules.pattern && !rules.validate) {
    rules.validate = (value: unknown) => {
      if (!value) return true;
      const str = String(value).trim();
      if (!str) return true;
      const withScheme = /^https?:\/\//i.test(str) ? str : `https://${str}`;
      try {
        const u = new URL(withScheme);
        if (!/\.[a-z]{2,}$/i.test(u.hostname)) {
          return "Bitte eine gültige URL eingeben (z.B. example.com)";
        }
        return true;
      } catch {
        return "Bitte eine gültige URL eingeben (z.B. example.com)";
      }
    };
  }

  return rules;
}

interface FieldMetaProps {
  subtext?: string;
  maxLen?: number;
  value: string;
}

function FieldMeta({ subtext, maxLen, value }: FieldMetaProps) {
  if (!subtext && maxLen === undefined) {
    return null;
  }

  return (
    <div className="flex justify-between items-start gap-4">
      <DynamicFormSubtext>{subtext}</DynamicFormSubtext>
      {maxLen !== undefined && (
        <CharCounter value={value} max={maxLen} className="shrink-0 mt-1.5" />
      )}
    </div>
  );
}

interface TextInputFieldProps {
  field: FormField;
  control: ReturnType<typeof useForm<SimpleFields>>["control"];
  error: string | undefined;
}

function TextInputField({ field, control, error }: TextInputFieldProps) {
  const maxLen = field.validation?.max;
  const key = fieldKey(field);
  const { field: rhfField } = useController({
    name: key,
    control,
    rules: buildValidationRules(field),
    defaultValue: "",
  });

  return (
    <div>
      <label htmlFor={key} className={labelClass}>
        {field.label}
        {field.required && (
          <SealWarningIcon
            weight="duotone"
            className="inline-block ml-1 w-3.5 h-3.5 text-[var(--ds-danger-text)] align-middle"
          />
        )}
      </label>
      <input
        id={key}
        type={
          field.inputType ??
          (field.type === "email" ? "email" : field.type === "password" ? "password" : "text")
        }
        placeholder={field.placeholder}
        maxLength={maxLen}
        className={inputClass}
        {...rhfField}
      />
      <FieldMeta subtext={field.subtext} maxLen={maxLen} value={rhfField.value ?? ""} />
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}

interface TextareaFieldProps {
  field: FormField;
  control: ReturnType<typeof useForm<SimpleFields>>["control"];
  error: string | undefined;
}

function TextareaField({ field, control, error }: TextareaFieldProps) {
  const maxLen = field.validation?.max;
  const key = fieldKey(field);
  const { field: rhfField } = useController({
    name: key,
    control,
    rules: buildValidationRules(field),
    defaultValue: "",
  });

  return (
    <div>
      <label htmlFor={key} className={labelClass}>
        {field.label}
        {field.required && (
          <SealWarningIcon
            weight="duotone"
            className="inline-block ml-1 w-3.5 h-3.5 text-[var(--ds-danger-text)] align-middle"
          />
        )}
      </label>
      {field.allowMarkdown ? (
        <Suspense
          fallback={
            <textarea
              id={key}
              placeholder={field.placeholder}
              rows={field.rows ?? 4}
              maxLength={maxLen}
              className={`${inputClass} h-auto py-2 resize-none`}
              value={rhfField.value}
              onChange={(event) => rhfField.onChange(event.target.value)}
            />
          }
        >
          <MarkdownEditor
            id={key}
            value={rhfField.value}
            onChange={(val) => rhfField.onChange(val)}
            placeholder={field.placeholder}
            rows={field.rows ?? 4}
            resizable
          />
        </Suspense>
      ) : (
        <textarea
          id={key}
          placeholder={field.placeholder}
          rows={field.rows ?? 4}
          maxLength={maxLen}
          className={`${inputClass} h-auto py-2 resize-none`}
          {...rhfField}
        />
      )}
      <FieldMeta subtext={field.subtext} maxLen={maxLen} value={rhfField.value ?? ""} />
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}

interface UrlFieldProps {
  field: FormField;
  control: ReturnType<typeof useForm<SimpleFields>>["control"];
  error: string | undefined;
}

function UrlField({ field, control, error }: UrlFieldProps) {
  const key = fieldKey(field);
  const maxLen = field.validation?.max;
  const { field: rhfField } = useController({
    name: key,
    control,
    rules: buildValidationRules(field),
    defaultValue: "",
  });

  return (
    <div>
      <label htmlFor={key} className={labelClass}>
        {field.label}
        {field.required && (
          <SealWarningIcon
            weight="duotone"
            className="inline-block ml-1 w-3.5 h-3.5 text-[var(--ds-danger-text)] align-middle"
          />
        )}
      </label>
      <input
        id={key}
        type="text"
        inputMode="url"
        placeholder={field.placeholder}
        maxLength={maxLen}
        className={inputClass}
        {...rhfField}
      />
      <FieldMeta subtext={field.subtext} maxLen={maxLen} value={rhfField.value ?? ""} />
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}

interface SelectFieldProps {
  field: FormField;
  register: ReturnType<typeof useForm<SimpleFields>>["register"];
  error: string | undefined;
}

function SelectField({ field, register, error }: SelectFieldProps) {
  const key = fieldKey(field);
  return (
    <div>
      <label htmlFor={key} className={labelClass}>
        {field.label}
        {field.required && (
          <SealWarningIcon
            weight="duotone"
            className="inline-block ml-1 w-3.5 h-3.5 text-[var(--ds-danger-text)] align-middle"
          />
        )}
      </label>
      <select id={key} className={inputClass} {...register(key, buildValidationRules(field))}>
        <option value="">Bitte wählen…</option>
        {(field.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}

interface MultiSelectDropdownProps {
  label: string;
  required?: boolean;
  placeholder?: string;
  subtext?: string;
  options: { value: string; label: string; flag?: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  error: string | undefined;
}

function CustomCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
        checked
          ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
          : "bg-white border-[var(--ds-border)]"
      }`}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 12 10" fill="none" aria-hidden="true">
          <path
            d="M1 5l3.5 3.5L11 1"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

function MultiSelectDropdown({
  label,
  required,
  placeholder,
  subtext,
  options,
  selected,
  onChange,
  error,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const allSelected = options.length > 0 && options.every((o) => selected.includes(o.value));

  function toggleAll() {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(options.map((o) => o.value));
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <span className={labelClass}>
        {label}
        {required && (
          <SealWarningIcon
            weight="duotone"
            className="inline-block ml-1 w-3.5 h-3.5 text-[var(--ds-danger-text)] align-middle"
          />
        )}
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-3 min-h-10 rounded-control border text-sm cursor-pointer text-left ${
          error ? "border-[var(--ds-danger-border)]" : "border-[var(--ds-border)]"
        } bg-[var(--ds-input-bg)] text-[var(--ds-text)]`}
      >
        <div className="flex flex-wrap gap-1.5 flex-1 py-1.5">
          {selected.length === 0 ? (
            <span className="text-[var(--ds-text-muted)] text-sm leading-6">
              {placeholder ?? "—"}
            </span>
          ) : (
            options
              .filter((o) => selected.includes(o.value))
              .map((o) => (
                <span
                  key={o.value}
                  className="flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-alt)] text-xs text-[var(--ds-text)]"
                >
                  {o.flag && <span className="leading-none">{o.flag}</span>}
                  {o.label}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(o.value);
                    }}
                    className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors leading-none"
                    aria-label={`${o.label} entfernen`}
                  >
                    <XCircleIcon weight="duotone" width={13} height={13} />
                  </button>
                </span>
              ))
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto self-stretch py-2">
          {selected.length > 0 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
                aria-label="Alle entfernen"
                className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors leading-none"
              >
                <XCircleIcon weight="duotone" width={16} height={16} />
              </button>
              <span className="w-px h-4 bg-[var(--ds-border)]" />
            </>
          )}
          {open ? (
            <CaretUpIcon
              weight="duotone"
              className="shrink-0 w-4 h-4 text-[var(--ds-text-muted)]"
            />
          ) : (
            <CaretDownIcon
              weight="duotone"
              className="shrink-0 w-4 h-4 text-[var(--ds-text-muted)]"
            />
          )}
        </div>
      </button>
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-[var(--ds-border)] rounded-xl shadow-lg max-h-64 overflow-y-auto">
          <label className="flex items-center gap-3 px-4 py-1.5 cursor-pointer hover:bg-[var(--ds-surface-alt)] select-none border-b border-[var(--ds-border)]">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="sr-only" />
            <CustomCheckbox checked={allSelected} />
            <span className="text-sm text-[var(--ds-text-muted)]">(Alle auswählen)</span>
          </label>
          {options.map(({ value, label: optLabel, flag }) => {
            const isChecked = selected.includes(value);
            return (
              <label
                key={value}
                className="flex items-center gap-3 px-4 py-1.5 cursor-pointer hover:bg-[var(--ds-surface-alt)] select-none"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(value)}
                  className="sr-only"
                />
                <CustomCheckbox checked={isChecked} />
                {flag && <span className="text-base leading-none">{flag}</span>}
                <span
                  className={`text-sm ${
                    isChecked
                      ? "font-semibold text-[var(--ds-text)]"
                      : "text-[var(--ds-text-muted)]"
                  }`}
                >
                  {optLabel}
                </span>
              </label>
            );
          })}
        </div>
      )}
      {error && <p className={errorClass}>{error}</p>}
      {subtext && <DynamicFormSubtext>{subtext}</DynamicFormSubtext>}
    </div>
  );
}

interface CategoryMultiSelectProps {
  field: FormField;
  categories: Category[];
  selected: number[];
  onChange: (ids: number[]) => void;
  error: string | undefined;
}

function CategoryMultiSelect({
  field,
  categories,
  selected,
  onChange,
  error,
}: CategoryMultiSelectProps) {
  const options = categories.map((cat) => ({ value: String(cat.id), label: cat.name }));
  const strSelected = selected.map(String);

  return (
    <MultiSelectDropdown
      label={field.label}
      required={field.required}
      placeholder={field.placeholder}
      subtext={field.subtext}
      options={options}
      selected={strSelected}
      onChange={(vals) => onChange(vals.map(Number))}
      error={error}
    />
  );
}

interface RegionMultiSelectProps {
  field: FormField;
  selected: string[];
  onChange: (codes: string[]) => void;
  error: string | undefined;
}

function RegionMultiSelect({ field, selected, onChange, error }: RegionMultiSelectProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          <span className={labelClass}>{field.label || "Versand-Regionen"}</span>
          <div className="h-11 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] animate-pulse" />
          {error && <p className={errorClass}>{error}</p>}
        </div>
      }
    >
      <RegionSelect
        value={selected}
        onChange={onChange}
        options={REGION_OPTIONS}
        messages={{
          label: field.label || "Versand-Regionen",
          placeholder: field.placeholder ?? "Versand-Regionen wählen…",
        }}
        error={error}
        variant="frontend"
      />
    </Suspense>
  );
}

interface StaticMultiSelectProps {
  field: FormField;
  selected: string[];
  onChange: (values: string[]) => void;
  error: string | undefined;
}

function StaticMultiSelect({ field, selected, onChange, error }: StaticMultiSelectProps) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div>
      <span className={labelClass}>
        {field.label}
        {field.required && (
          <SealWarningIcon
            weight="duotone"
            className="inline-block ml-1 w-3.5 h-3.5 text-[var(--ds-danger-text)] align-middle"
          />
        )}
      </span>
      <div className="flex flex-col gap-2">
        {(field.options ?? []).map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm text-[var(--ds-text)]">
            <input
              type="checkbox"
              value={opt}
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="rounded border-[var(--ds-border)]"
            />
            {opt}
          </label>
        ))}
      </div>
      {error && <p className={errorClass}>{error}</p>}
      {field.subtext && <DynamicFormSubtext>{field.subtext}</DynamicFormSubtext>}
    </div>
  );
}

const RICHTEXT_VARIANT_CLASSES: Record<RichTextVariant, string> = {
  default: "bg-[var(--ds-surface)] border border-[var(--ds-border)] text-[var(--ds-text)]",
  info: "bg-[var(--ds-info-bg)] border border-[var(--ds-info-border)] text-[var(--ds-info-text)]",
  warning:
    "bg-[var(--ds-warning-bg)] border border-[var(--ds-warning-border)] text-[var(--ds-warning-text)]",
  hint: "bg-[var(--ds-success-bg)] border border-[var(--ds-success-border)] text-[var(--ds-success-text)]",
};

function RichTextBlock({ field }: { field: FormField }) {
  const containerRef = useMarkdownHtml(field.content);

  if (!field.content) return null;

  const variantClass =
    RICHTEXT_VARIANT_CLASSES[field.variant ?? "default"] ?? RICHTEXT_VARIANT_CLASSES.default;

  return (
    <div
      ref={containerRef}
      className={`rounded-xl p-5 text-sm leading-relaxed prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ${variantClass}`}
    />
  );
}

export interface CheckShopResult {
  status: "available" | "published" | "rejected" | "pending" | "invalid" | "blocked";
  shopName?: string;
  shopUrl?: string;
  rejectionUrl?: string;
  messageMarkdown?: string;
}

interface ButtonFieldProps {
  field: FormField;
  formConfig: FormConfig;
  control: ReturnType<typeof useForm<SimpleFields>>["control"];
  setValue: ReturnType<typeof useForm<SimpleFields>>["setValue"];
  submitting: boolean;
  onCheckShopResult: (result: CheckShopResult) => void;
}

function ButtonField({
  field,
  formConfig,
  control,
  setValue,
  submitting,
  onCheckShopResult,
}: ButtonFieldProps) {
  const allFields = formConfig.rows.flatMap((r) => r.fields);
  const sourceField = field.buttonAction
    ? allFields.find((f) => f.id === field.buttonAction?.sourceFieldId)
    : undefined;
  const sourceKey = sourceField ? fieldKey(sourceField) : "";

  const watchedRaw = useWatch({ control, name: sourceKey as keyof SimpleFields });
  const watchedValue = typeof watchedRaw === "string" ? watchedRaw : "";

  const btnType = field.buttonType ?? "button";
  const isSubmit = btnType === "submit";
  const btnWidth = field.buttonWidth ?? "automatic";
  const btnAlign = field.buttonAlign ?? "left";
  const alignClass =
    btnAlign === "center" ? "justify-center" : btnAlign === "right" ? "justify-end" : "justify-start";
  const displayMode = field.buttonIcon ? (field.buttonDisplay ?? "both") : "text";

  const isCheckShopAction = field.buttonAction?.type === "check-shop";
  const isCheckShopDisabled = isCheckShopAction && watchedValue.trim() === "";
  const isDisabled = (isSubmit && submitting) || isCheckShopDisabled;

  async function handleButtonAction() {
    const action = field.buttonAction;
    if (!action || !sourceField) return;
    const val = watchedValue;
    switch (action.type) {
      case "open-url": {
        const safeUrl = getSafeActionUrl(val);
        if (safeUrl) window.open(safeUrl, "_blank", "noopener,noreferrer");
        break;
      }
      case "copy-clipboard":
        if (val) navigator.clipboard.writeText(val).catch(() => {});
        break;
      case "clear-field":
        setValue(sourceKey as keyof SimpleFields, "" as never);
        break;
      case "check-shop": {
        if (!val) return;
        try {
          const res = await fetch(`${API_BASE}/check-url?url=${encodeURIComponent(val)}`);
          const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
          const data =
            body && typeof body === "object"
              ? (body.data as Record<string, unknown> | undefined)
              : undefined;
          const status = data?.status;
          if (
            status !== "available" &&
            status !== "published" &&
            status !== "pending" &&
            status !== "rejected" &&
            status !== "invalid" &&
            status !== "blocked"
          ) {
            return;
          }
          onCheckShopResult({
            status,
            shopName: typeof data?.shopName === "string" ? data.shopName : undefined,
            shopUrl: typeof data?.shopUrl === "string" ? data.shopUrl : undefined,
            rejectionUrl: typeof data?.rejectionUrl === "string" ? data.rejectionUrl : undefined,
            messageMarkdown:
              typeof data?.messageMarkdown === "string" ? data.messageMarkdown : undefined,
          });
        } catch {
          // Users can retry the explicit availability check after transient network failures.
        }
        break;
      }
    }
  }

  return (
    <div className={`flex items-start pt-[1.625rem] min-w-0 ${alignClass}`}>
      <button
        type={btnType}
        disabled={isDisabled}
        title={displayMode === "icon" && field.label ? field.label : undefined}
        onClick={
          field.buttonAction && (field.buttonType ?? "button") === "button"
            ? () => {
                void handleButtonAction();
              }
            : undefined
        }
        className={`flex items-center gap-1.5 h-9 px-3 rounded-control font-medium text-sm transition-colors ${
          btnWidth === "full"
            ? "w-full justify-center"
            : isSubmit
              ? "max-sm:w-full max-sm:justify-center"
              : ""
        } ${
          isSubmit
            ? "bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] hover:bg-[var(--ds-btn-filled-hover)] disabled:opacity-60"
            : "border border-[var(--ds-btn-neutral-border)] text-[var(--ds-btn-neutral-text)] hover:border-[var(--ds-btn-neutral-hover-border)] disabled:opacity-60"
        }`}
      >
        {displayMode !== "text" && field.buttonIcon && (
          <LazyButtonIcon name={field.buttonIcon} width={18} height={18} />
        )}
        {displayMode !== "icon" && (
          <span className="truncate">{isSubmit && submitting ? "Wird gesendet…" : field.label}</span>
        )}
      </button>
    </div>
  );
}

interface FieldRendererProps {
  field: FormField;
  errors: ReturnType<typeof useForm<SimpleFields>>["formState"]["errors"];
  multiSelectErrors: Record<string, string>;
  control: ReturnType<typeof useForm<SimpleFields>>["control"];
  register: ReturnType<typeof useForm<SimpleFields>>["register"];
  setValue: ReturnType<typeof useForm<SimpleFields>>["setValue"];
  categories: Category[];
  categoryIds: number[];
  onCategoryIdsChange: (ids: number[]) => void;
  regionCodes: string[];
  onRegionCodesChange: (codes: string[]) => void;
  getStaticMultiSelected: (fieldId: string) => string[];
  setStaticMultiSelected: (fieldId: string, values: string[]) => void;
  formConfig: FormConfig;
  submitting: boolean;
  onCheckShopResult: (result: CheckShopResult) => void;
}

export function FieldRenderer({
  field,
  errors,
  multiSelectErrors,
  control,
  register,
  setValue,
  categories,
  categoryIds,
  onCategoryIdsChange,
  regionCodes,
  onRegionCodesChange,
  getStaticMultiSelected,
  setStaticMultiSelected,
  formConfig,
  submitting,
  onCheckShopResult,
}: FieldRendererProps) {
  const key = fieldKey(field);
  const fieldError = errors[key]?.message ?? multiSelectErrors[key];

  switch (field.type) {
    case "text":
    case "email":
    case "password":
      if (field.inputType === "url") {
        return <UrlField field={field} control={control} error={fieldError} />;
      }
      return <TextInputField field={field} control={control} error={fieldError} />;

    case "textarea":
      return <TextareaField field={field} control={control} error={fieldError} />;

    case "select":
      return <SelectField field={field} register={register} error={fieldError} />;

    case "multi-select":
      if (field.optionsSource === "categories") {
        return (
          <CategoryMultiSelect
            field={field}
            categories={categories}
            selected={categoryIds}
            onChange={onCategoryIdsChange}
            error={fieldError}
          />
        );
      }
      if (field.optionsSource === "regions") {
        return (
          <RegionMultiSelect
            field={field}
            selected={regionCodes}
            onChange={onRegionCodesChange}
            error={fieldError}
          />
        );
      }
      return (
        <StaticMultiSelect
          field={field}
          selected={getStaticMultiSelected(key)}
          onChange={(vals) => setStaticMultiSelected(key, vals)}
          error={fieldError}
        />
      );

    case "checkbox":
      return (
        <div>
          <label className="flex items-center gap-2 text-sm text-[var(--ds-text)]">
            <input
              type="checkbox"
              className="rounded border-[var(--ds-border)]"
              {...register(key, buildValidationRules(field))}
            />
            {field.label}
            {field.required && (
              <SealWarningIcon
                weight="duotone"
                className="inline-block ml-1 w-3.5 h-3.5 text-[var(--ds-danger-text)] align-middle"
              />
            )}
          </label>
          {fieldError && <p className={errorClass}>{fieldError}</p>}
        </div>
      );

    case "richtext":
      return <RichTextBlock field={field} />;

    case "headline": {
      const Tag = field.headlineLevel ?? "h2";
      const headlineClass: Record<string, string> = {
        h1: "text-3xl text-[var(--ds-text)]",
        h2: "text-2xl text-[var(--ds-text)]",
        h3: "text-xl text-[var(--ds-text)]",
      };
      return <Tag className={headlineClass[Tag]}>{field.label}</Tag>;
    }

    case "button":
      return (
        <ButtonField
          field={field}
          formConfig={formConfig}
          control={control}
          setValue={setValue}
          submitting={submitting}
          onCheckShopResult={onCheckShopResult}
        />
      );

    case "separator":
      return <hr className="border-[var(--ds-border)]" />;

    case "paragraph":
      return <p className="text-sm text-[var(--ds-text)] leading-relaxed">{field.content}</p>;

    default:
      return null;
  }
}
