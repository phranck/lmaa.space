import { useI18n } from "@/context/I18nContext.tsx";
import type { FormField, RichTextVariant } from "@lmaa/contracts";
import { Suspense, lazy } from "react";

const RichTextEditor = lazy(() =>
  import("@/features/form-builder/RichTextEditor.tsx").then((m) => ({ default: m.RichTextEditor })),
);

interface FieldConfigPanelProps {
  field: FormField;
  onChange: (updated: FormField) => void;
}

/**
 * Slide-in configuration panel for the currently selected form field.
 *
 * @param props - The selected field and an update callback.
 * @returns Panel with inputs for all editable field properties.
 */
export function FieldConfigPanel({ field, onChange }: FieldConfigPanelProps) {
  const { messages } = useI18n();
  const m = messages.formBuilder.panel;

  const isRichText = field.type === "richtext";
  const hasOptions = field.type === "select" || field.type === "multi-select";
  const hasValidationMinMax = field.type === "text" || field.type === "textarea";
  const hasPlaceholder = field.type !== "checkbox" && !isRichText;

  function set<K extends keyof FormField>(key: K, value: FormField[K]) {
    onChange({ ...field, [key]: value });
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded-card min-w-64">
      {/* Label */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider">
          {m.label}
        </span>
        <input
          type="text"
          value={field.label}
          onChange={(e) => set("label", e.target.value)}
          className="h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:border-[var(--color-primary)]"
        />
      </label>

      {/* Richtext: content editor */}
      {isRichText && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider">
            {m.content}
          </span>
          <Suspense
            fallback={
              <div className="h-32 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] flex items-center justify-center text-xs text-[var(--ds-text-subtle)]">
                Lade Editor…
              </div>
            }
          >
            <RichTextEditor
              value={field.content ?? ""}
              onChange={(val) => set("content", val || undefined)}
            />
          </Suspense>
        </div>
      )}

      {/* Richtext: variant picker */}
      {isRichText && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider">
            {m.variant}
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { value: "default", label: m.variantDefault },
                { value: "info", label: m.variantInfo },
                { value: "warning", label: m.variantWarning },
                { value: "hint", label: m.variantHint },
              ] as { value: RichTextVariant; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => set("variant", value)}
                className={`h-8 rounded-control border text-xs font-medium transition-colors ${
                  (field.variant ?? "default") === value
                    ? "border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
                    : "border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-[var(--ds-text)] hover:border-[var(--color-primary)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Placeholder */}
      {hasPlaceholder && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider">
            {m.placeholder}
          </span>
          <input
            type="text"
            value={field.placeholder ?? ""}
            onChange={(e) => set("placeholder", e.target.value || undefined)}
            className="h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </label>
      )}

      {/* Required — hidden for richtext blocks */}
      {!isRichText && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => set("required", e.target.checked)}
            className="w-4 h-4 accent-[var(--color-primary)]"
          />
          <span className="text-sm text-[var(--ds-text)]">{m.required}</span>
        </label>
      )}

      {/* Width — hidden for richtext blocks (always full-width) */}
      {!isRichText && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider">
            {m.width}
          </span>
          <div className="flex gap-2">
            {(["full", "half"] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => set("width", w)}
                className={`flex-1 h-9 rounded-control border text-sm font-medium transition-colors ${
                  field.width === w
                    ? "border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
                    : "border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-[var(--ds-text)] hover:border-[var(--color-primary)]"
                }`}
              >
                {w === "full" ? m.widthFull : m.widthHalf}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Options — only for select/multi-select without optionsSource */}
      {hasOptions && !field.optionsSource && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider">
            {m.options}
          </span>
          <textarea
            rows={4}
            value={(field.options ?? []).join("\n")}
            onChange={(e) => {
              const lines = e.target.value.split("\n").filter((l) => l.trim() !== "");
              set("options", lines.length > 0 ? lines : undefined);
            }}
            placeholder={m.optionsHint}
            className="px-3 py-2 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
          />
          <span className="text-xs text-[var(--ds-text-subtle)]">{m.optionsHint}</span>
        </label>
      )}

      {/* Validation min/max — only for text/textarea */}
      {hasValidationMinMax && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider">
            Validierung
          </span>
          <div className="flex gap-2">
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-xs text-[var(--ds-text-subtle)]">{m.validationMin}</span>
              <input
                type="number"
                value={field.validation?.min ?? ""}
                onChange={(e) => {
                  const val = e.target.value !== "" ? Number(e.target.value) : undefined;
                  set("validation", { ...field.validation, min: val });
                }}
                className="h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </label>
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-xs text-[var(--ds-text-subtle)]">{m.validationMax}</span>
              <input
                type="number"
                value={field.validation?.max ?? ""}
                onChange={(e) => {
                  const val = e.target.value !== "" ? Number(e.target.value) : undefined;
                  set("validation", { ...field.validation, max: val });
                }}
                className="h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
