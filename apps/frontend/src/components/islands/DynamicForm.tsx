import { useEffect, useRef, useState } from "react";
import { useController, useForm } from "react-hook-form";
import SFExclamationmarkSquareFill from "sf-symbols-lib/dualtone/SFExclamationmarkSquareFill";
import SFXmarkCircleFill from "sf-symbols-lib/monochrome/SFXmarkCircleFill";

import type { FormConfig, FormField, RichTextVariant } from "@lmaa/contracts";
import { createApiRequestError } from "@lmaa/shared";
import type { ApiRequestError } from "@lmaa/shared";
import type { Category } from "@lmaa/shared";
import { CharCounter, MarkdownEditor, RegionSelect, createRegionOptions } from "@lmaa/ui";

import { BUTTON_ICON_MAP } from "@/lib/buttonIconMap.tsx";
import { API_BASE } from "@/lib/client-api";
import { renderMarkdown } from "@/lib/markdown";

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

const REGION_OPTIONS = createRegionOptions({
  DE: "Deutschland",
  AT: "Österreich",
  CH: "Schweiz",
  EU: "Europäische Union",
  WORLD: "Weltweit",
});

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
  const messageRef = useRef<HTMLDivElement>(null);
  const renderKeyRef = useRef(0);

  useEffect(() => {
    const el = messageRef.current;
    if (!el) return;
    if (!message) {
      el.innerHTML = "";
      return;
    }
    const currentKey = ++renderKeyRef.current;
    void renderMarkdown(message).then((html) => {
      if (renderKeyRef.current === currentKey && messageRef.current) {
        messageRef.current.innerHTML = html;
      }
    });
  }, [message]);

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
          <SFExclamationmarkSquareFill className="inline-block ml-1 w-3.5 h-3.5 text-[var(--ds-danger-text)] align-middle" />
        )}
      </label>
      {field.allowMarkdown ? (
        <MarkdownEditor
          id={key}
          value={rhfField.value}
          onChange={(val) => rhfField.onChange(val)}
          placeholder={field.placeholder}
          rows={field.rows ?? 4}
          resizable
        />
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
      {(field.subtext || maxLen !== undefined) && (
        <div className="flex justify-between items-start gap-4">
          <DynamicFormSubtext>{field.subtext}</DynamicFormSubtext>
          {maxLen !== undefined && (
            <CharCounter value={rhfField.value} max={maxLen} className="shrink-0 mt-1.5" />
          )}
        </div>
      )}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// URL field with live duplicate-domain check
// ---------------------------------------------------------------------------

type UrlCheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "found"; shop: { id: number; name: string } }
  | { status: "notFound" };

interface UrlFieldProps {
  field: FormField;
  control: ReturnType<typeof useForm<SimpleFields>>["control"];
  error: string | undefined;
}

/**
 * Text input for URL fields that runs a debounced duplicate-domain check
 * against the public `/api/check-url` endpoint. Shows an amber warning when
 * the entered domain already exists in the shop catalog.
 *
 * @param props         - Component props.
 * @param props.field   - The field definition.
 * @param props.control - react-hook-form `control` object.
 * @param props.error   - Validation error message.
 * @returns URL input with inline duplicate warning.
 */
function UrlField({ field, control, error }: UrlFieldProps) {
  const key = fieldKey(field);
  const { field: rhfField } = useController({
    name: key,
    control,
    rules: buildValidationRules(field),
    defaultValue: "",
  });
  const [urlCheck, setUrlCheck] = useState<UrlCheckState>({ status: "idle" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedDomainRef = useRef<string>("");

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function extractDomain(val: string): string {
    const trimmed = val.trim();
    if (!trimmed) return "";
    try {
      const withProtocol = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
      return new URL(withProtocol).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return "";
    }
  }

  function scheduleCheck(val: string) {
    if (timerRef.current) clearTimeout(timerRef.current);

    const domain = extractDomain(val);

    if (!domain) {
      lastCheckedDomainRef.current = "";
      setUrlCheck({ status: "idle" });
      return;
    }

    // Only re-check when the domain portion actually changed
    if (domain === lastCheckedDomainRef.current) return;

    setUrlCheck({ status: "checking" });
    timerRef.current = setTimeout(() => {
      lastCheckedDomainRef.current = domain;
      void fetch(`${API_BASE}/check-url?url=${encodeURIComponent(domain)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then(
          (envelope: { data: { exists: boolean; shop?: { id: number; name: string } } } | null) => {
            const result = envelope?.data;
            if (result?.exists && result.shop) {
              setUrlCheck({ status: "found", shop: result.shop });
            } else {
              setUrlCheck({ status: "notFound" });
            }
          },
        )
        .catch(() => setUrlCheck({ status: "idle" }));
    }, 600);
  }

  return (
    <div>
      <label htmlFor={key} className={labelClass}>
        {field.label}
        {field.required && (
          <SFExclamationmarkSquareFill className="inline-block ml-1 w-3.5 h-3.5 text-[var(--ds-danger-text)] align-middle" />
        )}
      </label>
      <input
        id={key}
        type="url"
        placeholder={field.placeholder}
        className={inputClass}
        {...rhfField}
        onChange={(e) => {
          rhfField.onChange(e);
          scheduleCheck(e.target.value);
        }}
      />
      {field.subtext && <DynamicFormSubtext>{field.subtext}</DynamicFormSubtext>}
      {urlCheck.status === "checking" && (
        <p className="text-xs text-[var(--ds-text-subtle)] mt-1.5 px-1">Wird geprüft…</p>
      )}
      {urlCheck.status === "found" && (
        <p className="text-xs text-[var(--ds-warning-text)] bg-[var(--ds-warning-bg)] border border-[var(--ds-warning-border)] rounded-lg px-3 py-2 mt-1.5">
          Ein Shop mit dieser Domain ist bereits eingetragen: <strong>{urlCheck.shop.name}</strong>
        </p>
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
        {field.required && (
          <SFExclamationmarkSquareFill className="inline-block ml-1 w-3.5 h-3.5 text-[var(--ds-danger-text)] align-middle" />
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
          <SFExclamationmarkSquareFill className="inline-block ml-1 w-3.5 h-3.5 text-[var(--ds-danger-text)] align-middle" />
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
    <RegionSelect
      value={selected}
      onChange={onChange}
      options={REGION_OPTIONS}
      messages={{
        label: field.label,
        placeholder: field.placeholder ?? "Region wählen…",
      }}
      error={error}
      variant="frontend"
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
        {field.required && (
          <SFExclamationmarkSquareFill className="inline-block ml-1 w-3.5 h-3.5 text-[var(--ds-danger-text)] align-middle" />
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
 * via {@link renderMarkdown} and injected with `innerHTML`. The visual style
 * is determined by `field.variant`.
 *
 * @param props       - Component props.
 * @param props.field - The richtext field with `content` and optional `variant`.
 * @returns A styled container with rendered HTML, or `null` when there is no content.
 */
function RichTextBlock({ field }: { field: FormField }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderKeyRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!field.content) {
      el.innerHTML = "";
      return;
    }
    const currentKey = ++renderKeyRef.current;
    void renderMarkdown(field.content).then((html) => {
      if (renderKeyRef.current === currentKey && containerRef.current) {
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
    control,
    handleSubmit,
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
      <SuccessScreen
        onReset={handleReset}
        headline={formConfig.submissionConfig?.successHeadline}
        message={formConfig.submissionConfig?.successMessage}
      />
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
        if (field.inputType === "url") {
          return <UrlField key={field.id} field={field} control={control} error={fieldError} />;
        }
        return (
          <div key={field.id}>
            <label htmlFor={key} className={labelClass}>
              {field.label}
              {field.required && (
                <SFExclamationmarkSquareFill className="inline-block ml-1 w-3.5 h-3.5 text-[var(--ds-danger-text)] align-middle" />
              )}
            </label>
            <input
              id={key}
              type={
                field.inputType ??
                (field.type === "email" ? "email" : field.type === "password" ? "password" : "text")
              }
              placeholder={field.placeholder}
              className={inputClass}
              {...register(key, buildValidationRules(field))}
            />
            {field.subtext && <DynamicFormSubtext>{field.subtext}</DynamicFormSubtext>}
            {fieldError && <p className={errorClass}>{fieldError}</p>}
          </div>
        );

      case "textarea":
        return <TextareaField key={field.id} field={field} control={control} error={fieldError} />;

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
              {field.required && (
                <SFExclamationmarkSquareFill className="inline-block ml-1 w-3.5 h-3.5 text-[var(--ds-danger-text)] align-middle" />
              )}
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
                  <SFExclamationmarkSquareFill className="shrink-0 w-3.5 h-3.5 text-[var(--ds-danger-text)]" />
                  Mit diesem Symbol gekennzeichnete Felder sind Pflichtfelder und müssen ausgefüllt
                  werden.
                </p>
              )}
              <div className="grid grid-cols-12 gap-4">
                {row.fields.map((field) => (
                  <div key={field.id} style={{ gridColumn: `span ${field.span ?? 12}` }}>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </div>
          );
        });
      })()}

      {submitError && (
        <p className="text-[var(--ds-danger-text)] text-sm text-center">{submitError}</p>
      )}
    </form>
  );
}
