import { CaretDownIcon, CaretUpIcon, IconContext } from "@phosphor-icons/react";
import { SealWarningIcon, XCircleIcon } from "@phosphor-icons/react";
import { Suspense, lazy, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";

import type { FormConfig, FormField, RichTextVariant } from "@lmaa/contracts";
import { createApiRequestError } from "@lmaa/shared";
import type { ApiRequestError } from "@lmaa/shared";
import type { Category } from "@lmaa/shared";
import { AlertDialog } from "@lmaa/ui";
import { CharCounter } from "@lmaa/ui/char-counter";
import { createDefaultRegionOptions } from "@lmaa/ui/region-select";

import LazyButtonIcon from "@/components/islands/LazyButtonIcon.tsx";
import { useMarkdownHtml } from "@/hooks/useMarkdownHtml";
import { API_BASE } from "@/lib/client-api";
import { expandFormConfigText } from "@/lib/expand-form-config";
import { getSafeActionUrl, getSafeConfigHref } from "@/lib/safe-url";

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  formConfig: FormConfig;
  categories: Category[];
}

/**
 * Plain text values managed by react-hook-form.
 * Multi-select fields (categoryIds, region) are handled separately via useState.
 */
type SimpleFields = Record<string, string>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION_OPTIONS = createDefaultRegionOptions("de");

const inputClass =
  "w-full px-3 h-9 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent)]";

const errorClass = "text-[var(--ds-danger-text)] text-xs mt-1";

const labelClass = "block text-sm font-medium text-[var(--ds-text)] mb-1.5 px-1";

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function DynamicFormSubtext({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-[var(--ds-text-subtle)] mt-1.5 px-1">{children}</p>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts network/API errors into user-facing submit messages.
 *
 * @param error - Unknown error from fetch or API helper.
 * @returns Localized message suitable for inline form feedback.
 */
function getSubmissionErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "Verbindung zum Server fehlgeschlagen. Bitte prüfe deine Verbindung.";
  }

  const typedError = error as ApiRequestError;
  const status = typedError.status;

  if (status === 429) {
    return "Zu viele Vorschläge von deiner Verbindung. Bitte versuche es später erneut.";
  }

  if (status === 400) {
    return typedError.responseMessage || "Bitte prüfe deine Eingaben und versuche es erneut.";
  }

  if (status && status >= 500) {
    return "Serverfehler beim Absenden. Bitte versuche es später erneut.";
  }

  if (typedError.responseMessage) return typedError.responseMessage;
  if (status) return `Absenden fehlgeschlagen (HTTP ${status}). Bitte später erneut versuchen.`;

  return "Fehler beim Absenden. Bitte versuche es erneut.";
}

/**
 * Returns the backend submission key for a field.
 *
 * Uses `field.name` when set (configured in the form builder), otherwise falls
 * back to `field.id` so every field always has a stable payload key.
 *
 * @param field - The form field to derive a key for.
 * @returns The submission key string.
 */
function fieldKey(field: FormField): string {
  return field.name ?? field.id;
}

/**
 * Returns react-hook-form validation rules for a given field definition.
 */
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

  // Auto patterns when no custom pattern is set
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

// ---------------------------------------------------------------------------
// Success screen
// ---------------------------------------------------------------------------

interface SuccessScreenProps {
  onReset: () => void;
  headline?: string;
  message?: string;
}

/**
 * Full-page success confirmation shown after a form is submitted successfully.
 *
 * @param props            - Component props.
 * @param props.onReset    - Callback that resets the parent form back to its initial state.
 * @param props.headline   - Optional custom headline from `submissionConfig`.
 * @param props.message    - Optional custom success message (Markdown) from `submissionConfig`.
 * @returns Success screen markup.
 */
function SuccessScreen({ onReset, headline, message }: SuccessScreenProps) {
  const messageRef = useMarkdownHtml(message);

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--ds-accent-subtle)] flex items-center justify-center mx-auto mb-6">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--ds-accent)]"
          aria-hidden
        >
          <title>Erfolgreich gesendet</title>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ds-text)] mb-3">
        {headline ?? "Vielen Dank!"}
      </h1>
      {message && (
        <div
          ref={messageRef}
          className="text-sm text-[var(--ds-text-muted)] prose prose-sm max-w-none"
        />
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
        <a
          href="/"
          className="inline-flex items-center justify-center h-9 px-6 bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-filled-hover)] transition-colors"
        >
          Zur Startseite
        </a>
        <button
          type="button"
          onClick={onReset}
          className="h-9 px-6 border border-[var(--ds-btn-neutral-border)] text-[var(--ds-btn-neutral-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
        >
          Weiteres Formular ausfüllen
        </button>
      </div>
      <p className="mt-10 text-sm text-[var(--ds-text-subtle)]">
        Dir gefällt lmaa.space?{" "}
        <a
          href="https://ko-fi.com/layeredwork?ref=lmaa.space"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--ds-accent)] hover:underline"
        >
          Unterstütze das Projekt!
        </a>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field renderers
// ---------------------------------------------------------------------------

interface TextareaFieldProps {
  field: FormField;
  control: ReturnType<typeof useForm<SimpleFields>>["control"];
  error: string | undefined;
}

interface TextInputFieldProps {
  field: FormField;
  control: ReturnType<typeof useForm<SimpleFields>>["control"];
  error: string | undefined;
}

function FieldMeta({
  subtext,
  maxLen,
  value,
}: {
  subtext?: string;
  maxLen?: number;
  value: string;
}) {
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

/**
 * Textarea input with optional character counter and validation error.
 * Uses `useController` so both the plain textarea and `MarkdownEditor` share
 * the same controlled `value`/`onChange` API.
 * When `field.allowMarkdown` is true, renders a `MarkdownEditor`.
 *
 * @param props          - Component props.
 * @param props.field    - The field definition (label, placeholder, rows, validation).
 * @param props.control  - react-hook-form `control` object.
 * @param props.error    - Validation error message to display below the input.
 * @returns Textarea field with label and optional counter.
 */
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

// ---------------------------------------------------------------------------
// URL field (simple input, validation happens server-side on submit)
// ---------------------------------------------------------------------------

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

/**
 * Native `<select>` dropdown populated from `field.options`.
 *
 * @param props           - Component props.
 * @param props.field     - The field definition (label, options, required, validation).
 * @param props.register  - react-hook-form `register` function.
 * @param props.error     - Validation error message to display below the select.
 * @returns Select field with label and error.
 */
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

// ---------------------------------------------------------------------------
// Shared multi-select dropdown
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Category multi-select
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Region multi-select
// ---------------------------------------------------------------------------

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

/**
 * Multi-select list of arbitrary string values sourced from `field.options`.
 *
 * Used for `multi-select` fields without a dedicated `optionsSource` (i.e.
 * when the options are configured directly in the form builder).
 *
 * @param props           - Component props.
 * @param props.field     - The field definition (label, options, required).
 * @param props.selected  - Currently selected string values.
 * @param props.onChange  - Callback fired with the updated value array on toggle.
 * @param props.error     - Validation error message.
 * @returns Checkbox list of static options.
 */
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

// ---------------------------------------------------------------------------
// Richtext block renderer
// ---------------------------------------------------------------------------

const RICHTEXT_VARIANT_CLASSES: Record<RichTextVariant, string> = {
  default: "bg-[var(--ds-surface)] border border-[var(--ds-border)] text-[var(--ds-text)]",
  info: "bg-[var(--ds-info-bg)] border border-[var(--ds-info-border)] text-[var(--ds-info-text)]",
  warning:
    "bg-[var(--ds-warning-bg)] border border-[var(--ds-warning-border)] text-[var(--ds-warning-text)]",
  hint: "bg-[var(--ds-success-bg)] border border-[var(--ds-success-border)] text-[var(--ds-success-text)]",
};

/**
 * Renders a read-only Markdown block inside the form.
 *
 * The Markdown content (`field.content`) is converted to HTML asynchronously
 * via {@link useMarkdownHtml} and injected into the container ref. The visual
 * style is determined by `field.variant`.
 *
 * @param props       - Component props.
 * @param props.field - The richtext field with `content` and optional `variant`.
 * @returns A styled container with rendered HTML, or `null` when there is no content.
 */
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

function PublishedShopName({ name, url }: { name: string | undefined; url: string | undefined }) {
  if (!name) return null;
  if (!url) return <strong>{name}</strong>;
  const isExternal = /^https?:\/\//i.test(url);
  return (
    <a
      href={url}
      className="font-bold text-[var(--ds-accent)] underline hover:no-underline"
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {name}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Form state (useReducer)
// ---------------------------------------------------------------------------

interface FormState {
  categoryIds: number[];
  regionCodes: string[];
  staticMultiSelects: Record<string, string[]>;
  submitting: boolean;
  submitError: {
    message: string;
    status?: "published" | "rejected" | "pending" | "available" | "invalid";
    shopName?: string;
    shopUrl?: string;
    rejectionUrl?: string;
  } | null;
  submitted: boolean;
  multiSelectErrors: Record<string, string>;
}

const initialFormState: FormState = {
  categoryIds: [],
  regionCodes: [],
  staticMultiSelects: {},
  submitting: false,
  submitError: null,
  submitted: false,
  multiSelectErrors: {},
};

function formReducer(s: FormState, patch: Partial<FormState>): FormState {
  return { ...s, ...patch };
}

// ---------------------------------------------------------------------------
// ButtonField
// ---------------------------------------------------------------------------

interface CheckShopResult {
  status: "available" | "published" | "rejected" | "pending" | "invalid";
  shopName?: string;
  shopUrl?: string;
  rejectionUrl?: string;
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

  // useWatch must be called unconditionally; pass empty key when no source.
  const watchedRaw = useWatch({ control, name: sourceKey as keyof SimpleFields });
  const watchedValue = typeof watchedRaw === "string" ? watchedRaw : "";

  const btnType = field.buttonType ?? "button";
  const isSubmit = btnType === "submit";
  const btnWidth = field.buttonWidth ?? "automatic";
  const btnAlign = field.buttonAlign ?? "left";
  const alignClass =
    btnAlign === "center"
      ? "justify-center"
      : btnAlign === "right"
        ? "justify-end"
        : "justify-start";
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
            status !== "invalid"
          ) {
            return;
          }
          onCheckShopResult({
            status,
            shopName: typeof data?.shopName === "string" ? data.shopName : undefined,
            shopUrl: typeof data?.shopUrl === "string" ? data.shopUrl : undefined,
            rejectionUrl: typeof data?.rejectionUrl === "string" ? data.rejectionUrl : undefined,
          });
        } catch {
          // network failure — silently ignore; user can retry
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
          btnWidth === "full" ? "w-full justify-center" : isSubmit ? "max-sm:w-full max-sm:justify-center" : ""
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
          <span className="truncate">
            {isSubmit && submitting ? "Wird gesendet…" : field.label}
          </span>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FieldRenderer
// ---------------------------------------------------------------------------

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

/**
 * Renders the appropriate input element for a single {@link FormField}.
 *
 * Dispatches to the correct sub-component or inline markup based on
 * `field.type`. Returns `null` for field types that produce no user-facing
 * input (e.g. `"button"`).
 */
function FieldRenderer({
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
      return (
        <Tag className={headlineClass[Tag]}>
          {field.label}
        </Tag>
      );
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
      return (
        <p className="text-sm text-[var(--ds-text)] leading-relaxed">
          {field.content}
        </p>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Renders a form driven entirely by a `FormConfig` object fetched from the
 * backend. Supports text, email, textarea, select, multi-select (categories /
 * regions / static options) and checkbox field types.
 *
 * Multi-select fields bypass react-hook-form and are managed with local state
 * so we can collect typed arrays (number[] / string[]) for the submission
 * payload.
 *
 * @param props - Form configuration and available categories.
 * @returns Rendered dynamic form or success screen after submission.
 */
export default function DynamicForm({ formConfig: rawFormConfig, categories }: Props) {
  const formConfig = useMemo(() => expandFormConfigText(rawFormConfig), [rawFormConfig]);

  // --- react-hook-form for simple scalar fields ---
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SimpleFields>({ mode: "onSubmit" });

  // --- form state (useReducer) ---
  const [state, dispatch] = useReducer(formReducer, initialFormState);

  // --- helpers ---

  /**
   * Returns the currently selected string values for a static multi-select field.
   *
   * @param fieldId - The submission key of the field (see {@link fieldKey}).
   * @returns Array of selected option strings, empty array when nothing is selected.
   */
  function getStaticMultiSelected(fieldId: string): string[] {
    return state.staticMultiSelects[fieldId] ?? [];
  }

  /**
   * Updates the selected values for a static multi-select field in component state.
   *
   * @param fieldId - The submission key of the field.
   * @param values  - The new array of selected option strings.
   */
  function setStaticMultiSelected(fieldId: string, values: string[]) {
    dispatch({ staticMultiSelects: { ...state.staticMultiSelects, [fieldId]: values } });
  }

  /**
   * Validates all multi-select fields that bypass react-hook-form.
   *
   * Iterates over every `multi-select` field in the form config and verifies
   * that required fields have at least one selection. Stores any errors in
   * `multiSelectErrors` state.
   *
   * @returns `true` when all required multi-select fields are satisfied, `false` otherwise.
   */
  function validateMultiSelects(): boolean {
    const newErrors: Record<string, string> = {};

    for (const row of formConfig.rows) {
      for (const field of row.fields) {
        if (field.type !== "multi-select" || !field.required) continue;

        if (field.optionsSource === "categories") {
          if (state.categoryIds.length === 0) {
            newErrors[fieldKey(field)] = `${field.label} ist ein Pflichtfeld`;
          }
        } else if (field.optionsSource === "regions") {
          if (state.regionCodes.length === 0) {
            newErrors[fieldKey(field)] = `${field.label} ist ein Pflichtfeld`;
          }
        } else {
          const selected = getStaticMultiSelected(fieldKey(field));
          if (selected.length === 0) {
            newErrors[fieldKey(field)] = `${field.label} ist ein Pflichtfeld`;
          }
        }
      }
    }

    dispatch({ multiSelectErrors: newErrors });
    return Object.keys(newErrors).length === 0;
  }

  // --- submit ---

  /**
   * Handles form submission after react-hook-form has validated all scalar fields.
   *
   * Builds a generic key/value payload from all non-display fields, then POSTs
   * to `/form/:slug/submit`. On success either redirects or shows the success screen.
   *
   * @param data - Validated scalar field values from react-hook-form.
   */
  async function onSubmit(data: SimpleFields) {
    if (!validateMultiSelects()) return;

    dispatch({ submitError: null, submitting: true });

    try {
      const payload: Record<string, unknown> = {};

      for (const row of formConfig.rows) {
        for (const field of row.fields) {
          if (["richtext", "button", "headline", "separator", "paragraph"].includes(field.type)) {
            continue;
          }
          const key = fieldKey(field);
          if (field.type === "multi-select") {
            if (field.optionsSource === "categories") {
              payload[key] = state.categoryIds;
            } else if (field.optionsSource === "regions") {
              payload[key] = state.regionCodes;
            } else {
              payload[key] = state.staticMultiSelects[key] ?? [];
            }
          } else {
            const val = data[key];
            if (val !== undefined && val !== "") payload[key] = val;
          }
        }
      }

      const slug = formConfig.slug ?? formConfig.name;
      const res = await fetch(`${API_BASE}/form/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 409) {
          const body = await res.json().catch(() => null);
          const error = body && typeof body === "object" && "error" in body ? (body as Record<string, unknown>).error : null;
          const errorObj = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
          const rawStatus = errorObj?.status;
          const status =
            rawStatus === "published" || rawStatus === "rejected" || rawStatus === "pending"
              ? rawStatus
              : undefined;
          dispatch({
            submitError: {
              message: typeof errorObj?.message === "string" ? errorObj.message : "Dieser Shop ist bereits bekannt.",
              status,
              shopName: typeof errorObj?.shopName === "string" ? errorObj.shopName : undefined,
              shopUrl: typeof errorObj?.shopUrl === "string" ? errorObj.shopUrl : undefined,
              rejectionUrl: typeof errorObj?.rejectionUrl === "string" ? errorObj.rejectionUrl : undefined,
            },
          });
          return;
        }
        throw await createApiRequestError(res, "Submit failed");
      }

      const safeRedirect = getSafeConfigHref(formConfig.submissionConfig?.successRedirectUrl);
      if (safeRedirect) {
        window.location.href = safeRedirect;
      } else {
        dispatch({ submitted: true });
      }
    } catch (error) {
      dispatch({ submitError: { message: getSubmissionErrorMessage(error) } });
    } finally {
      dispatch({ submitting: false });
    }
  }

  /**
   * Resets all form state back to the initial empty state.
   *
   * Clears react-hook-form values, all multi-select selections, and the
   * submission error so the user can submit another entry.
   */
  function handleReset() {
    reset();
    dispatch(initialFormState);
  }

  // --- success screen ---

  if (state.submitted) {
    return (
      <SuccessScreen
        onReset={handleReset}
        headline={formConfig.submissionConfig?.successHeadline}
        message={formConfig.submissionConfig?.successMessage}
      />
    );
  }

  // --- layout ---

  return (
    <IconContext.Provider
      value={{
        weight: "duotone",
        style: {
          transform: "scale(1.14)",
          transformBox: "fill-box",
          transformOrigin: "center",
        },
      }}
    >
      {/* preventDefault is required: this is a client:only React island with no
         server action. Submission is handled entirely via client-side API calls,
         so the native browser form submit (page reload) must be suppressed. */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(onSubmit)(event);
        }}
        className="space-y-6"
      >
        {(() => {
          const hasRequiredFields = formConfig.rows.some((row) => row.fields.some((f) => f.required));
          let legendRendered = false;

          return formConfig.rows.map((row) => {
            const isSubmitRow = row.fields.some(
              (f) => f.type === "button" && f.buttonType === "submit",
            );
            const showLegend = isSubmitRow && hasRequiredFields && !legendRendered;
            if (showLegend) legendRendered = true;

            return (
              <div key={row.id}>
                {showLegend && (
                  <p className="flex items-center gap-1.5 text-xs text-[var(--ds-text-subtle)] mb-6 px-1">
                    <SealWarningIcon
                      weight="duotone"
                      className="shrink-0 w-3.5 h-3.5 text-[var(--ds-danger-text)]"
                    />
                    Mit diesem Symbol gekennzeichnete Felder sind Pflichtfelder und müssen ausgefüllt
                    werden.
                  </p>
                )}
                <div className="grid grid-cols-12 gap-4">
                  {(() => {
                    const linkedFieldIds = new Set(
                      row.fields
                        .filter((f) => f.type === "button" && f.buttonAction?.sourceFieldId)
                        .map((f) => f.buttonAction!.sourceFieldId),
                    );
                    const linkedFields = row.fields.filter(
                      (f) => (f.type === "button" && !!f.buttonAction?.sourceFieldId) || linkedFieldIds.has(f.id),
                    );
                    const linkedTotal = linkedFields.reduce((sum, f) => sum + (f.span ?? 12), 0);
                    const scale = linkedTotal > 0 && linkedTotal < 12 ? 12 / linkedTotal : 1;

                    return row.fields.map((field) => {
                      const span = field.span ?? 12;
                      const hasLinkedButton = field.type === "button" && !!field.buttonAction?.sourceFieldId;
                      const isLinked = hasLinkedButton || linkedFieldIds.has(field.id);
                      const mobileSpan = isLinked ? Math.round(span * scale) : 12;
                      return (
                        <div key={field.id} className={isLinked ? "max-sm:![grid-column:var(--mobile-span)]" : "max-sm:!col-span-12"} style={{ gridColumn: `span ${span}`, "--mobile-span": `span ${mobileSpan}` } as React.CSSProperties}>
                          <FieldRenderer
                            field={field}
                            errors={errors}
                            multiSelectErrors={state.multiSelectErrors}
                            control={control}
                            register={register}
                            setValue={setValue}
                            categories={categories}
                            categoryIds={state.categoryIds}
                            onCategoryIdsChange={(ids) => dispatch({ categoryIds: ids })}
                            regionCodes={state.regionCodes}
                            onRegionCodesChange={(codes) => dispatch({ regionCodes: codes })}
                            getStaticMultiSelected={getStaticMultiSelected}
                            setStaticMultiSelected={setStaticMultiSelected}
                            formConfig={formConfig}
                            submitting={state.submitting}
                            onCheckShopResult={(result) =>
                              dispatch({
                                submitError: {
                                  message: "",
                                  status: result.status,
                                  shopName: result.shopName,
                                  shopUrl: result.shopUrl,
                                  rejectionUrl: result.rejectionUrl,
                                },
                              })
                            }
                          />
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          });
        })()}

        <AlertDialog
          open={!!state.submitError}
          title={
            state.submitError?.status === "rejected"
              ? "Shop abgelehnt"
              : state.submitError?.status === "pending"
                ? "Shop wird bereits geprüft"
                : state.submitError?.status === "available"
                  ? "Shop ist verfügbar"
                  : state.submitError?.status === "invalid"
                    ? "Ungültige URL"
                    : "Shop bereits vorhanden"
          }
          variant={
            state.submitError?.status === "rejected"
              ? "warning"
              : state.submitError?.status === "available"
                ? "info"
                : "error"
          }
          buttonLabel="Verstanden"
          onClose={() => dispatch({ submitError: null })}
        >
          {state.submitError?.status === "invalid" ? (
            <p>
              Bitte eine gültige Shop-URL eingeben (z.B. <code>example.de</code>).
            </p>
          ) : state.submitError?.status === "rejected" ? (
            <p>
              Der Shop <strong>{state.submitError.shopName}</strong> wurde bereits geprüft und abgelehnt.
              Eine ausführliche Begründung für die Ablehnung kannst du{" "}
              {state.submitError.rejectionUrl ? (
                <a
                  href={state.submitError.rejectionUrl}
                  className="text-[var(--ds-accent)] underline hover:no-underline"
                >
                  hier einsehen
                </a>
              ) : (
                "beim Betreiber anfragen"
              )}
              .
            </p>
          ) : state.submitError?.status === "pending" ? (
            <p>
              Da hatte wohl jemand bereits die gleiche Idee!
              <br />
              Der Shop <strong>{state.submitError.shopName}</strong> wurde schon eingereicht und wartet auf Prüfung.
            </p>
          ) : state.submitError?.status === "available" ? (
            <p>
              Der Shop ist noch nicht eingetragen.
              <br />
              Du kannst die Eintragung jetzt absenden.
            </p>
          ) : (
            <p>
              Da hatte wohl jemand bereits die gleiche Idee!
              <br />
              Der Shop <PublishedShopName name={state.submitError?.shopName} url={state.submitError?.shopUrl} /> ist schon eingetragen.
            </p>
          )}
        </AlertDialog>
      </form>
    </IconContext.Provider>
  );
}
