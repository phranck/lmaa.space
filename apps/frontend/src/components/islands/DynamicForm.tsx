import { BUTTON_ICON_MAP } from "@/lib/buttonIconMap.tsx";
import { API_BASE } from "@/lib/client-api";
import { renderMarkdown } from "@/lib/markdown";
import type { FormConfig, FormField, RichTextVariant } from "@lmaa/contracts";
import type { ApiRequestError } from "@lmaa/shared";
import { createApiRequestError } from "@lmaa/shared";
import type { Category } from "@lmaa/shared";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { SFXmarkCircleFill } from "sf-symbols-lib/monochrome";

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

const REGION_OPTIONS: { code: string; label: string; flag: string }[] = [
  { code: "DE", label: "Deutschland", flag: "🇩🇪" },
  { code: "AT", label: "Österreich", flag: "🇦🇹" },
  { code: "CH", label: "Schweiz", flag: "🇨🇭" },
  { code: "EU", label: "Europäische Union", flag: "🇪🇺" },
  { code: "WORLD", label: "Weltweit", flag: "🌍" },
];

const inputClass =
  "w-full px-3 h-9 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

const errorClass = "text-[var(--ds-danger-text)] text-xs mt-1";

const labelClass = "block text-sm font-medium text-[var(--ds-text)] mb-1.5 px-[5px]";

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

  // Auto email pattern when no custom pattern is set
  const effectiveType = field.inputType ?? field.type;
  if (effectiveType === "email" && !rules.pattern) {
    rules.pattern = {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Bitte eine gültige E-Mail-Adresse eingeben",
    };
  }

  return rules;
}

// ---------------------------------------------------------------------------
// Success screen
// ---------------------------------------------------------------------------

interface SuccessScreenProps {
  onReset: () => void;
  message?: string;
}

/**
 * Full-page success confirmation shown after a form is submitted successfully.
 *
 * @param props           - Component props.
 * @param props.onReset   - Callback that resets the parent form back to its initial state.
 * @param props.message   - Optional custom success message from `submissionConfig`.
 * @returns Success screen markup.
 */
function SuccessScreen({ onReset, message }: SuccessScreenProps) {
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
        {message ?? "Vielen Dank!"}
      </h1>
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
  currentValue: string;
  register: ReturnType<typeof useForm<SimpleFields>>["register"];
  error: string | undefined;
}

/**
 * Textarea input with optional character counter and validation error.
 *
 * @param props               - Component props.
 * @param props.field         - The field definition (used for label, placeholder, rows, validation).
 * @param props.currentValue  - Current watched value for the character counter.
 * @param props.register      - react-hook-form `register` function.
 * @param props.error         - Validation error message to display below the input.
 * @returns Textarea field with label and optional counter.
 */
function TextareaField({ field, currentValue, register, error }: TextareaFieldProps) {
  const maxLen = field.validation?.max;
  const key = fieldKey(field);
  return (
    <div>
      <label htmlFor={key} className={labelClass}>
        {field.label}
        {field.required && <span className="text-[var(--ds-danger-text)] ml-0.5">*</span>}
      </label>
      <textarea
        id={key}
        placeholder={field.placeholder}
        rows={field.rows ?? 4}
        maxLength={maxLen}
        className={`${inputClass} h-auto py-2 resize-none`}
        {...register(key, buildValidationRules(field))}
      />
      {(field.subtext || maxLen !== undefined) && (
        <div className="flex justify-between items-start mt-1.5 gap-4">
          <p className="text-xs text-[var(--ds-text-subtle)] px-[5px]">{field.subtext ?? ""}</p>
          {maxLen !== undefined && (
            <span className="text-xs text-[var(--ds-text-subtle)] shrink-0">
              {currentValue.length}/{maxLen}
            </span>
          )}
        </div>
      )}
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
        {field.required && <span className="text-[var(--ds-danger-text)] ml-0.5">*</span>}
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
  options: { value: string; label: string; flag?: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  error: string | undefined;
}

function MultiSelectDropdown({
  label,
  required,
  placeholder,
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

  return (
    <div ref={containerRef} className="relative">
      <span className={labelClass}>
        {label}
        {required && <span className="text-[var(--ds-danger-text)] ml-0.5">*</span>}
      </span>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: dropdown trigger */}
      <div
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-3 min-h-10 rounded-control border text-sm cursor-pointer ${
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
                    <SFXmarkCircleFill width={13} height={13} />
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
                <SFXmarkCircleFill width={16} height={16} />
              </button>
              <span className="w-px h-4 bg-[var(--ds-border)]" />
            </>
          )}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            className={`shrink-0 transition-transform text-[var(--ds-text-muted)] ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
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
  const options = REGION_OPTIONS.map(({ code, label, flag }) => ({ value: code, label, flag }));

  function handleChange(newSelected: string[]) {
    const added = newSelected.find((v) => !selected.includes(v));
    if (!added) {
      // Nur eine Option wurde entfernt → direkt übernehmen
      onChange(newSelected);
      return;
    }
    if (added === "WORLD") {
      onChange(["WORLD"]);
    } else if (added === "EU") {
      // EU: inkompatibel mit WORLD, DE, AT — CH ist erlaubt (nicht EU-Mitglied)
      onChange(newSelected.filter((v) => v !== "WORLD" && v !== "DE" && v !== "AT"));
    } else if (added === "DE" || added === "AT") {
      // DE/AT: inkompatibel mit WORLD und EU
      onChange(newSelected.filter((v) => v !== "WORLD" && v !== "EU"));
    } else {
      // CH: inkompatibel nur mit WORLD (kann mit DE, AT, EU kombiniert werden)
      onChange(newSelected.filter((v) => v !== "WORLD"));
    }
  }

  return (
    <MultiSelectDropdown
      label={field.label}
      required={field.required}
      placeholder={field.placeholder}
      options={options}
      selected={selected}
      onChange={handleChange}
      error={error}
    />
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
        {field.required && <span className="text-[var(--ds-danger-text)] ml-0.5">*</span>}
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Richtext block renderer
// ---------------------------------------------------------------------------

const RICHTEXT_VARIANT_CLASSES: Record<RichTextVariant, string> = {
  default: "bg-[var(--ds-surface)] border border-[var(--ds-border)] text-[var(--ds-text)]",
  info: "bg-blue-50 border border-blue-200 text-blue-900",
  warning: "bg-amber-50 border border-amber-200 text-amber-900",
  hint: "bg-green-50 border border-green-200 text-green-900",
};

/**
 * Renders a read-only Markdown block inside the form.
 *
 * The Markdown content (`field.content`) is converted to HTML asynchronously
 * via {@link renderMarkdown} and injected with `innerHTML`. The visual style
 * is determined by `field.variant`.
 *
 * @param props       - Component props.
 * @param props.field - The richtext field with `content` and optional `variant`.
 * @returns A styled container with rendered HTML, or `null` when there is no content.
 */
function RichTextBlock({ field }: { field: FormField }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!field.content) {
      el.innerHTML = "";
      return;
    }
    void renderMarkdown(field.content).then((html) => {
      if (containerRef.current) {
        containerRef.current.innerHTML = html;
      }
    });
  }, [field.content]);

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
export default function DynamicForm({ formConfig, categories }: Props) {
  // --- react-hook-form for simple scalar fields ---
  const {
    register,
    handleSubmit,
    watch,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<SimpleFields>({ mode: "onSubmit" });

  // --- manual state for multi-select fields ---
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [regionCodes, setRegionCodes] = useState<string[]>([]);
  // generic multi-select fields with static options (keyed by fieldKey(field))
  const [staticMultiSelects, setStaticMultiSelects] = useState<Record<string, string[]>>({});

  // --- submission state ---
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // --- manual validation errors for multi-select fields ---
  const [multiSelectErrors, setMultiSelectErrors] = useState<Record<string, string>>({});

  // --- helpers ---

  /**
   * Returns the currently selected string values for a static multi-select field.
   *
   * @param fieldId - The submission key of the field (see {@link fieldKey}).
   * @returns Array of selected option strings, empty array when nothing is selected.
   */
  function getStaticMultiSelected(fieldId: string): string[] {
    return staticMultiSelects[fieldId] ?? [];
  }

  /**
   * Updates the selected values for a static multi-select field in component state.
   *
   * @param fieldId - The submission key of the field.
   * @param values  - The new array of selected option strings.
   */
  function setStaticMultiSelected(fieldId: string, values: string[]) {
    setStaticMultiSelects((prev) => ({ ...prev, [fieldId]: values }));
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
          if (categoryIds.length === 0) {
            newErrors[fieldKey(field)] = `${field.label} ist ein Pflichtfeld`;
          }
        } else if (field.optionsSource === "regions") {
          if (regionCodes.length === 0) {
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

    setMultiSelectErrors(newErrors);
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

    setSubmitError(null);
    setSubmitting(true);

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
              payload[key] = categoryIds;
            } else if (field.optionsSource === "regions") {
              payload[key] = regionCodes;
            } else {
              payload[key] = staticMultiSelects[key] ?? [];
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
        throw await createApiRequestError(res, "Submit failed");
      }

      const redirect = formConfig.submissionConfig?.successRedirectUrl;
      if (redirect) {
        window.location.href = redirect;
      } else {
        setSubmitted(true);
      }
    } catch (error) {
      setSubmitError(getSubmissionErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Resets all form state back to the initial empty state.
   *
   * Clears react-hook-form values, all multi-select selections, the URL check
   * result, and the submission error so the user can submit another entry.
   */
  function handleReset() {
    setSubmitted(false);
    reset();
    setCategoryIds([]);
    setRegionCodes([]);
    setStaticMultiSelects({});
    setMultiSelectErrors({});
    setSubmitError(null);
  }

  // --- success screen ---

  if (submitted) {
    return (
      <SuccessScreen onReset={handleReset} message={formConfig.submissionConfig?.successMessage} />
    );
  }

  // --- field renderer ---

  /**
   * Renders the appropriate input element for a single {@link FormField}.
   *
   * Dispatches to the correct sub-component or inline markup based on
   * `field.type`. Returns `null` for field types that produce no user-facing
   * input (e.g. `"button"`).
   *
   * @param field - The field definition to render.
   * @returns The rendered React element, or `null`.
   */
  function renderField(field: FormField) {
    const key = fieldKey(field);
    const fieldError = errors[key]?.message ?? multiSelectErrors[key];

    switch (field.type) {
      case "text":
      case "email":
      case "password":
        return (
          <div key={field.id}>
            <label htmlFor={key} className={labelClass}>
              {field.label}
              {field.required && <span className="text-[var(--ds-danger-text)] ml-0.5">*</span>}
            </label>
            <input
              id={key}
              type={
                field.inputType ??
                (field.type === "email"
                  ? "email"
                  : field.type === "password"
                    ? "password"
                    : "text")
              }
              placeholder={field.placeholder}
              className={inputClass}
              {...register(key, buildValidationRules(field))}
            />
            {field.subtext && (
              <p className="text-xs text-[var(--ds-text-subtle)] mt-1.5 px-[5px]">
                {field.subtext}
              </p>
            )}
            {fieldError && <p className={errorClass}>{fieldError}</p>}
          </div>
        );

      case "textarea":
        return (
          <TextareaField
            key={field.id}
            field={field}
            currentValue={watch(key) ?? ""}
            register={register}
            error={fieldError}
          />
        );

      case "select":
        return <SelectField key={field.id} field={field} register={register} error={fieldError} />;

      case "multi-select":
        if (field.optionsSource === "categories") {
          return (
            <CategoryMultiSelect
              key={field.id}
              field={field}
              categories={categories}
              selected={categoryIds}
              onChange={setCategoryIds}
              error={fieldError}
            />
          );
        }
        if (field.optionsSource === "regions") {
          return (
            <RegionMultiSelect
              key={field.id}
              field={field}
              selected={regionCodes}
              onChange={setRegionCodes}
              error={fieldError}
            />
          );
        }
        return (
          <StaticMultiSelect
            key={field.id}
            field={field}
            selected={getStaticMultiSelected(key)}
            onChange={(vals) => setStaticMultiSelected(key, vals)}
            error={fieldError}
          />
        );

      case "checkbox":
        return (
          <div key={field.id}>
            <label className="flex items-center gap-2 text-sm text-[var(--ds-text)]">
              <input
                type="checkbox"
                className="rounded border-[var(--ds-border)]"
                {...register(key, buildValidationRules(field))}
              />
              {field.label}
              {field.required && <span className="text-[var(--ds-danger-text)] ml-0.5">*</span>}
            </label>
            {fieldError && <p className={errorClass}>{fieldError}</p>}
          </div>
        );

      case "richtext":
        return <RichTextBlock key={field.id} field={field} />;

      case "headline": {
        const Tag = field.headlineLevel ?? "h2";
        const headlineClass: Record<string, string> = {
          h1: "text-3xl text-[var(--ds-text)]",
          h2: "text-2xl text-[var(--ds-text)]",
          h3: "text-xl text-[var(--ds-text)]",
        };
        return (
          <Tag key={field.id} className={headlineClass[Tag]}>
            {field.label}
          </Tag>
        );
      }

      case "button": {
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
        const ButtonIcon = field.buttonIcon ? BUTTON_ICON_MAP[field.buttonIcon] : null;
        const displayMode = ButtonIcon ? (field.buttonDisplay ?? "both") : "text";

        function handleButtonAction() {
          const action = field.buttonAction;
          if (!action) return;
          const allFields = formConfig.rows.flatMap((r) => r.fields);
          const sourceField = allFields.find((f) => f.id === action.sourceFieldId);
          if (!sourceField) return;
          const srcKey = fieldKey(sourceField);
          const val = (getValues(srcKey as keyof SimpleFields) as string) ?? "";
          switch (action.type) {
            case "open-url":
              if (val) window.open(val, "_blank", "noopener,noreferrer");
              break;
            case "copy-clipboard":
              if (val) navigator.clipboard.writeText(val).catch(() => {});
              break;
            case "clear-field":
              setValue(srcKey as keyof SimpleFields, "" as never);
              break;
          }
        }

        return (
          <div key={field.id} className={`flex items-start pt-[1.625rem] min-w-0 ${alignClass}`}>
            <button
              type={btnType}
              disabled={isSubmit && submitting}
              title={displayMode === "icon" && field.label ? field.label : undefined}
              onClick={
                field.buttonAction && (field.buttonType ?? "button") === "button"
                  ? handleButtonAction
                  : undefined
              }
              className={`flex items-center gap-1.5 h-9 px-3 rounded-control font-medium text-sm transition-colors ${
                btnWidth === "full" ? "w-full justify-center" : ""
              } ${
                isSubmit
                  ? "bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] hover:bg-[var(--ds-btn-filled-hover)] disabled:opacity-60"
                  : "border border-[var(--ds-btn-neutral-border)] text-[var(--ds-btn-neutral-text)] hover:border-[var(--ds-btn-neutral-hover-border)]"
              }`}
            >
              {displayMode !== "text" && ButtonIcon && <ButtonIcon width={15} height={15} />}
              {displayMode !== "icon" && (
                <span className="truncate">
                  {isSubmit && submitting ? "Wird gesendet…" : field.label}
                </span>
              )}
            </button>
          </div>
        );
      }

      case "separator":
        return <hr key={field.id} className="border-[var(--ds-border)]" />;

      case "paragraph":
        return (
          <p key={field.id} className="text-sm text-[var(--ds-text)] leading-relaxed">
            {field.content}
          </p>
        );

      default:
        return null;
    }
  }

  // --- layout ---

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit(onSubmit)(event);
      }}
      className="space-y-6"
    >
      {formConfig.rows.map((row) => (
        <div key={row.id} className="grid grid-cols-12 gap-4">
          {row.fields.map((field) => (
            <div key={field.id} style={{ gridColumn: `span ${field.span ?? 12}` }}>
              {renderField(field)}
            </div>
          ))}
        </div>
      ))}

      {submitError && (
        <p className="text-[var(--ds-danger-text)] text-sm text-center">{submitError}</p>
      )}
    </form>
  );
}
