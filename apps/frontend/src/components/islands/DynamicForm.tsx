import { API_BASE } from "@/lib/client-api";
import { renderMarkdown } from "@/lib/markdown";
import type { FormConfig, FormField, RichTextVariant } from "@lmaa/contracts";
import type { ApiRequestError } from "@lmaa/shared";
import { createApiRequestError } from "@lmaa/shared";
import type { Category, ShopCategory } from "@lmaa/shared";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  formConfig: FormConfig;
  categories: Category[];
}

type UrlCheckResult =
  | { exists: false }
  | { exists: true; shop: { id: number; name: string; categories: ShopCategory[] } };

/**
 * Plain text values managed by react-hook-form.
 * Multi-select fields (categoryIds, region) are handled separately via useState.
 */
type SimpleFields = Record<string, string>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION_OPTIONS: { code: string; label: string }[] = [
  { code: "DE", label: "Deutschland" },
  { code: "AT", label: "Österreich" },
  { code: "CH", label: "Schweiz" },
  { code: "EU", label: "Rest EU" },
];

const inputClass =
  "w-full px-3 h-9 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

const errorClass = "text-[var(--ds-danger-text)] text-xs mt-1";

const labelClass = "block text-sm font-medium text-[var(--ds-text)] mb-1.5";

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

  return rules;
}

// ---------------------------------------------------------------------------
// Success screen
// ---------------------------------------------------------------------------

interface SuccessScreenProps {
  onReset: () => void;
}

function SuccessScreen({ onReset }: SuccessScreenProps) {
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
        Vielen Dank für deinen Vorschlag!
      </h1>
      <p className="text-[var(--ds-text-muted)] mb-10 leading-relaxed">
        Wir prüfen ihn und nehmen ihn bei Eignung in die Liste auf.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
          Weiteren Shop vorschlagen
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

function TextareaField({ field, currentValue, register, error }: TextareaFieldProps) {
  const maxLen = field.validation?.max;
  return (
    <div>
      <label htmlFor={field.id} className={labelClass}>
        {field.label}
        {field.required && <span className="text-[var(--ds-danger-text)] ml-0.5">*</span>}
      </label>
      <textarea
        id={field.id}
        placeholder={field.placeholder}
        rows={4}
        className={`${inputClass} h-auto py-2 resize-none`}
        {...register(field.id, buildValidationRules(field))}
      />
      <div className="flex justify-between items-start mt-1.5 gap-4">
        <p className="text-xs text-[var(--ds-text-subtle)] leading-relaxed">
          Eine gute Beschreibung hilft anderen, den Shop schneller einzuschätzen.
        </p>
        {maxLen !== undefined && (
          <span className="text-xs text-[var(--ds-text-subtle)] shrink-0">
            {currentValue.length}/{maxLen}
          </span>
        )}
      </div>
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
  return (
    <div>
      <label htmlFor={field.id} className={labelClass}>
        {field.label}
        {field.required && <span className="text-[var(--ds-danger-text)] ml-0.5">*</span>}
      </label>
      <select
        id={field.id}
        className={inputClass}
        {...register(field.id, buildValidationRules(field))}
      >
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
  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter((v) => v !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div>
      <span className={labelClass}>
        {field.label}
        {field.required && <span className="text-[var(--ds-danger-text)] ml-0.5">*</span>}
      </span>
      <div className="flex flex-col gap-2">
        {categories.map((cat) => (
          <label key={cat.id} className="flex items-center gap-2 text-sm text-[var(--ds-text)]">
            <input
              type="checkbox"
              value={String(cat.id)}
              checked={selected.includes(cat.id)}
              onChange={() => toggle(cat.id)}
              className="rounded border-[var(--ds-border)]"
            />
            {cat.name}
          </label>
        ))}
      </div>
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}

interface RegionMultiSelectProps {
  field: FormField;
  selected: string[];
  onChange: (codes: string[]) => void;
  error: string | undefined;
}

function RegionMultiSelect({ field, selected, onChange, error }: RegionMultiSelectProps) {
  function toggle(code: string) {
    if (selected.includes(code)) {
      onChange(selected.filter((v) => v !== code));
    } else {
      onChange([...selected, code]);
    }
  }

  return (
    <div>
      <span className={labelClass}>
        {field.label}
        {field.required && <span className="text-[var(--ds-danger-text)] ml-0.5">*</span>}
      </span>
      <div className="flex flex-col gap-2">
        {REGION_OPTIONS.map(({ code, label }) => (
          <label key={code} className="flex items-center gap-2 text-sm text-[var(--ds-text)]">
            <input
              type="checkbox"
              value={code}
              checked={selected.includes(code)}
              onChange={() => toggle(code)}
              className="rounded border-[var(--ds-border)]"
            />
            {label}
          </label>
        ))}
      </div>
      {error && <p className={errorClass}>{error}</p>}
    </div>
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
      className={`rounded-xl px-5 py-4 text-sm leading-relaxed prose prose-sm max-w-none ${variantClass}`}
    />
  );
}

// ---------------------------------------------------------------------------
// URL warning widget
// ---------------------------------------------------------------------------

interface UrlWarningProps {
  checking: boolean;
  result: UrlCheckResult | null;
}

function UrlWarning({ checking, result }: UrlWarningProps) {
  if (checking) {
    return (
      <p className="text-[var(--ds-text-subtle)] text-xs mt-1.5">Prüfe ob Shop bereits bekannt…</p>
    );
  }

  if (result?.exists) {
    return (
      <div className="mt-2 px-3 py-2.5 bg-[var(--ds-warning-bg)] border border-[var(--ds-warning-text)]/25 rounded-control text-sm text-[var(--ds-warning-text)]">
        <span className="font-medium">{result.shop.name}</span> ist bereits in unserer Liste
        {result.shop.categories.length > 0 && (
          <span>
            {" "}
            in{" "}
            {result.shop.categories.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ", "}
                <span className="font-medium">{c.name}</span>
              </span>
            ))}
          </span>
        )}
        .
      </div>
    );
  }

  return null;
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
    formState: { errors },
  } = useForm<SimpleFields>({ mode: "onBlur" });

  // --- manual state for multi-select fields ---
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [regionCodes, setRegionCodes] = useState<string[]>([]);
  // generic multi-select fields with static options (keyed by field.id)
  const [staticMultiSelects, setStaticMultiSelects] = useState<Record<string, string[]>>({});

  // --- URL duplicate check ---
  const [urlCheck, setUrlCheck] = useState<UrlCheckResult | null>(null);
  const [urlChecking, setUrlChecking] = useState(false);

  // --- submission state ---
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // --- manual validation errors for multi-select fields ---
  const [multiSelectErrors, setMultiSelectErrors] = useState<Record<string, string>>({});

  // Watch shopUrl so we can access the latest value on blur
  const shopUrlValue = watch("shopUrl") ?? "";

  // --- helpers ---

  async function checkUrl(url: string) {
    if (!url || !url.startsWith("http")) return;
    setUrlChecking(true);
    try {
      const res = await fetch(`${API_BASE}/check-url?url=${encodeURIComponent(url)}`);
      const json = (await res.json()) as { data: UrlCheckResult };
      setUrlCheck(json.data);
    } catch {
      setUrlCheck(null);
    } finally {
      setUrlChecking(false);
    }
  }

  function getStaticMultiSelected(fieldId: string): string[] {
    return staticMultiSelects[fieldId] ?? [];
  }

  function setStaticMultiSelected(fieldId: string, values: string[]) {
    setStaticMultiSelects((prev) => ({ ...prev, [fieldId]: values }));
  }

  function validateMultiSelects(): boolean {
    const newErrors: Record<string, string> = {};

    for (const row of formConfig.rows) {
      for (const field of row.fields) {
        if (field.type !== "multi-select" || !field.required) continue;

        if (field.optionsSource === "categories") {
          if (categoryIds.length === 0) {
            newErrors[field.id] = `${field.label} ist ein Pflichtfeld`;
          }
        } else if (field.optionsSource === "regions") {
          if (regionCodes.length === 0) {
            newErrors[field.id] = `${field.label} ist ein Pflichtfeld`;
          }
        } else {
          const selected = getStaticMultiSelected(field.id);
          if (selected.length === 0) {
            newErrors[field.id] = `${field.label} ist ein Pflichtfeld`;
          }
        }
      }
    }

    setMultiSelectErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // --- submit ---

  async function onSubmit(data: SimpleFields) {
    if (!validateMultiSelects()) return;

    setSubmitError(null);
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        shopName: data.shopName ?? undefined,
        shopUrl: data.shopUrl ?? undefined,
        categoryIds,
        region: regionCodes,
      };

      // Include any other scalar fields from the form config that have values
      for (const row of formConfig.rows) {
        for (const field of row.fields) {
          if (
            field.id === "shopName" ||
            field.id === "shopUrl" ||
            field.type === "multi-select" ||
            field.type === "richtext"
          ) {
            continue;
          }
          const value = data[field.id];
          if (value !== undefined && value !== "") {
            payload[field.id] = value;
          }
        }
      }

      const res = await fetch(`${API_BASE}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw await createApiRequestError(res, "Submission request failed");
      }

      setSubmitted(true);
    } catch (error) {
      setSubmitError(getSubmissionErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setSubmitted(false);
    reset();
    setCategoryIds([]);
    setRegionCodes([]);
    setStaticMultiSelects({});
    setUrlCheck(null);
    setMultiSelectErrors({});
    setSubmitError(null);
  }

  // --- success screen ---

  if (submitted) {
    return <SuccessScreen onReset={handleReset} />;
  }

  // --- field renderer ---

  function renderField(field: FormField) {
    const fieldError = errors[field.id]?.message ?? multiSelectErrors[field.id];

    switch (field.type) {
      case "text":
      case "email":
        if (field.id === "shopUrl") {
          return (
            <div key={field.id}>
              <label htmlFor={field.id} className={labelClass}>
                {field.label}
                {field.required && <span className="text-[var(--ds-danger-text)] ml-0.5">*</span>}
              </label>
              <input
                id={field.id}
                type={field.type}
                placeholder={field.placeholder}
                className={inputClass}
                {...register(field.id, buildValidationRules(field))}
                onBlur={() => {
                  void checkUrl(shopUrlValue);
                }}
              />
              <UrlWarning checking={urlChecking} result={urlCheck} />
              {fieldError && <p className={errorClass}>{fieldError}</p>}
            </div>
          );
        }
        return (
          <div key={field.id}>
            <label htmlFor={field.id} className={labelClass}>
              {field.label}
              {field.required && <span className="text-[var(--ds-danger-text)] ml-0.5">*</span>}
            </label>
            <input
              id={field.id}
              type={field.type}
              placeholder={field.placeholder}
              className={inputClass}
              {...register(field.id, buildValidationRules(field))}
            />
            {fieldError && <p className={errorClass}>{fieldError}</p>}
          </div>
        );

      case "textarea":
        return (
          <TextareaField
            key={field.id}
            field={field}
            currentValue={watch(field.id) ?? ""}
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
            selected={getStaticMultiSelected(field.id)}
            onChange={(vals) => setStaticMultiSelected(field.id, vals)}
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
                {...register(field.id, buildValidationRules(field))}
              />
              {field.label}
              {field.required && <span className="text-[var(--ds-danger-text)] ml-0.5">*</span>}
            </label>
            {fieldError && <p className={errorClass}>{fieldError}</p>}
          </div>
        );

      case "richtext":
        return <RichTextBlock key={field.id} field={field} />;

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
        <div key={row.id} className="flex gap-4">
          {row.fields.map((field) => (
            <div
              key={field.id}
              className={field.type === "richtext" || field.width === "full" ? "flex-1" : "w-1/2"}
            >
              {renderField(field)}
            </div>
          ))}
        </div>
      ))}

      {submitError && (
        <p className="text-[var(--ds-danger-text)] text-sm text-center">{submitError}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="h-9 px-6 bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] rounded-control font-medium text-sm hover:bg-[var(--ds-btn-filled-hover)] transition-colors disabled:opacity-60"
        >
          {submitting ? "Wird gesendet…" : "Vorschlag absenden"}
        </button>
      </div>
    </form>
  );
}
