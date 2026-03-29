import {
  CalendarIcon,
  DeviceMobileIcon,
  EnvelopeOpenIcon,
  HashStraightIcon,
  LinkIcon,
  LockIcon,
  TextAaIcon,
} from "@phosphor-icons/react";
import { Suspense, lazy } from "react";

import type {
  ButtonActionType,
  FieldType,
  FormField,
  InputType,
  RichTextVariant,
} from "@lmaa/contracts";
import { FormLabelText, MarkdownEditor } from "@lmaa/ui";

import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

const IconPicker = lazy(() =>
  import("@/components/ui/IconPicker.tsx").then((module) => ({ default: module.IconPicker })),
);

// ---------------------------------------------------------------------------
// Field type label helper
// ---------------------------------------------------------------------------

export function fieldTypeLabel(type: FieldType, ft: Record<string, string>): string {
  // FieldType uses kebab-case ("multi-select") but i18n keys use camelCase
  const key = type.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  return ft[key] ?? ft[type] ?? type;
}

interface FieldConfigPanelProps {
  field: FormField;
  onChange: (updated: FormField) => void;
  allFields: { id: string; label: string }[];
}

/**
 * Slide-in configuration panel for the currently selected form field.
 *
 * @param props - The selected field and an update callback.
 * @returns Panel with inputs for all editable field properties.
 */
export function FieldConfigPanel({ field, onChange, allFields }: FieldConfigPanelProps) {
  const { messages } = useI18n();
  const m = messages.formBuilder.panel;
  const isRichText = field.type === "richtext";
  const isButton = field.type === "button";
  const isHeadline = field.type === "headline";
  const isSeparator = field.type === "separator";
  const isParagraph = field.type === "paragraph";
  const isTextInput = field.type === "text" || field.type === "email" || field.type === "password";
  const effectiveInputType: InputType =
    field.inputType ??
    (field.type === "email" ? "email" : field.type === "password" ? "password" : "text");

  const inputTypeOptions: DropdownOption<InputType>[] = [
    { value: "text", label: m.inputTypeText, icon: <TextAaIcon weight="duotone" size={15} /> },
    { value: "email", label: m.inputTypeEmail, icon: <EnvelopeOpenIcon weight="duotone" size={15} /> },
    { value: "password", label: m.inputTypePassword, icon: <LockIcon weight="duotone" size={15} /> },
    { value: "url", label: m.inputTypeUrl, icon: <LinkIcon weight="duotone" size={15} /> },
    { value: "tel", label: m.inputTypeTel, icon: <DeviceMobileIcon weight="duotone" size={15} /> },
    { value: "date", label: m.inputTypeDate, icon: <CalendarIcon weight="duotone" size={15} /> },
    {
      value: "number",
      label: m.inputTypeNumber,
      icon: <HashStraightIcon weight="duotone" size={15} />,
    },
  ];
  const hasOptions = field.type === "select" || field.type === "multi-select";
  const hasValidationMinMax =
    isTextInput && effectiveInputType !== "date" && effectiveInputType !== "number";
  const hasMaxChars = field.type === "textarea";
  const hasSubtext = isTextInput || field.type === "textarea" || field.type === "multi-select";
  const hasRows = field.type === "textarea" || isRichText;
  const hasPlaceholder =
    field.type !== "checkbox" &&
    !isRichText &&
    !isButton &&
    !isHeadline &&
    !isSeparator &&
    !isParagraph;

  /**
   * Updates a single property on the current field and notifies the parent.
   *
   * @param key   - The {@link FormField} property to update.
   * @param value - The new value for the given property.
   */
  function set<K extends keyof FormField>(key: K, value: FormField[K]) {
    onChange({ ...field, [key]: value });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Separator: no config except span */}
      {isSeparator && (
        <p className="text-xs text-[var(--ds-text-subtle)] italic">{m.separatorNoSettings}</p>
      )}

      {/* Paragraph: plain text content */}
      {isParagraph && (
        <label className="flex flex-col gap-1">
          <FormLabelText>
            {m.content}
          </FormLabelText>
          <textarea
            rows={4}
            value={field.content ?? ""}
            onChange={(e) => set("content", e.target.value || undefined)}
            className="px-3 py-1.5 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
          />
        </label>
      )}

      {/* Label — hidden for separator and paragraph */}
      {!isSeparator && !isParagraph && (
        <label className="flex flex-col gap-1">
          <FormLabelText>
            {m.label}
          </FormLabelText>
          <input
            type="text"
            value={field.label}
            onChange={(e) => set("label", e.target.value)}
            className="h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </label>
      )}

      {/* Input type — for text/email/password fields */}
      {isTextInput && (
        <Dropdown
          value={effectiveInputType}
          onChange={(v) => onChange({ ...field, type: "text", inputType: v })}
          options={inputTypeOptions}
          label={m.inputType}
        />
      )}

      {/* Headline level — only for headline fields */}
      {isHeadline && (
        <div className="flex flex-col gap-1">
          <FormLabelText>
            {m.headlineLevel}
          </FormLabelText>
          <div className="flex flex-col gap-1.5">
            {(
              [
                { value: "h1", label: m.headlineLevelH1 },
                { value: "h2", label: m.headlineLevelH2 },
                { value: "h3", label: m.headlineLevelH3 },
              ] as { value: "h1" | "h2" | "h3"; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => set("headlineLevel", value)}
                className={`h-8 rounded-control border text-xs font-medium ${
                  (field.headlineLevel ?? "h2") === value
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

      {/* Variable name — hidden for richtext, button, headline, separator, paragraph */}
      {!isRichText && !isButton && !isHeadline && !isSeparator && !isParagraph && (
        <label className="flex flex-col gap-1">
          <FormLabelText>
            {m.fieldName}
          </FormLabelText>
          <input
            type="text"
            value={field.name ?? ""}
            onChange={(e) => set("name", e.target.value || undefined)}
            placeholder={field.id}
            className="h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] placeholder:opacity-40 focus:outline-none focus:border-[var(--color-primary)]"
          />
        </label>
      )}

      {/* Richtext: content editor */}
      {isRichText && (
        <div className="flex flex-col gap-1">
          <FormLabelText>
            {m.content}
          </FormLabelText>
          <MarkdownEditor
            value={field.content ?? ""}
            onChange={(val) => set("content", val || undefined)}
            rows={field.rows}
          />
        </div>
      )}

      {/* Richtext: variant picker */}
      {isRichText && (
        <div className="flex flex-col gap-1">
          <FormLabelText>
            {m.variant}
          </FormLabelText>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                {
                  value: "default",
                  label: m.variantDefault,
                  base: "bg-[var(--ds-surface)] text-[var(--ds-text)]",
                  active: "border-2 border-[var(--ds-text-muted)]",
                  inactive: "border border-[var(--ds-border)]",
                },
                {
                  value: "info",
                  label: m.variantInfo,
                  base: "bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-300",
                  active: "border-2 border-blue-400 dark:border-blue-500",
                  inactive: "border border-blue-200 dark:border-blue-800",
                },
                {
                  value: "warning",
                  label: m.variantWarning,
                  base: "bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300",
                  active: "border-2 border-amber-400 dark:border-amber-500",
                  inactive: "border border-amber-200 dark:border-amber-800",
                },
                {
                  value: "hint",
                  label: m.variantHint,
                  base: "bg-green-50 dark:bg-green-950/50 text-green-900 dark:text-green-300",
                  active: "border-2 border-green-500 dark:border-green-500",
                  inactive: "border border-green-200 dark:border-green-800",
                },
              ] as {
                value: RichTextVariant;
                label: string;
                base: string;
                active: string;
                inactive: string;
              }[]
            ).map(({ value, label, base, active, inactive }) => (
              <button
                key={value}
                type="button"
                onClick={() => set("variant", value)}
                className={`h-8 rounded-control text-xs font-medium ${base} ${
                  (field.variant ?? "default") === value ? active : inactive
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
          <FormLabelText>
            {m.placeholder}
          </FormLabelText>
          <input
            type="text"
            value={field.placeholder ?? ""}
            onChange={(e) => set("placeholder", e.target.value || undefined)}
            className="h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </label>
      )}

      {/* Max chars — only for textarea */}
      {hasMaxChars && (
        <label className="flex flex-col gap-1">
          <FormLabelText>
            {m.maxChars}
          </FormLabelText>
          <input
            type="number"
            min={1}
            value={field.validation?.max ?? ""}
            onChange={(e) => {
              const val = e.target.value !== "" ? Number(e.target.value) : undefined;
              set("validation", { ...field.validation, max: val });
            }}
            placeholder="–"
            className="h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] placeholder:opacity-40 focus:outline-none focus:border-[var(--color-primary)]"
          />
        </label>
      )}

      {/* Subtext — for text, email, password, textarea */}
      {hasSubtext && (
        <label className="flex flex-col gap-1">
          <FormLabelText>
            {m.subtext}
          </FormLabelText>
          <input
            type="text"
            value={field.subtext ?? ""}
            onChange={(e) => set("subtext", e.target.value || undefined)}
            className="h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </label>
      )}

      {/* Required — hidden for richtext, button, headline, separator, paragraph */}
      {!isRichText && !isButton && !isHeadline && !isSeparator && !isParagraph && (
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

      {/* Allow Markdown — only for textarea */}
      {field.type === "textarea" && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={field.allowMarkdown ?? false}
            onChange={(e) => set("allowMarkdown", e.target.checked || undefined)}
            className="w-4 h-4 accent-[var(--color-primary)]"
          />
          <span className="text-sm text-[var(--ds-text)]">{m.allowMarkdown}</span>
        </label>
      )}

      {/* Span — hidden for richtext, button and separator */}
      {!isRichText && !isButton && !isSeparator && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FormLabelText>
              {m.span}
            </FormLabelText>
            <span className="text-xs tabular-nums text-[var(--ds-text-subtle)]">
              {field.span ?? 12}/12
            </span>
          </div>
          <div className="grid grid-cols-12 gap-0.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} ${m.spanAriaOf} 12`}
                onClick={() => set("span", n)}
                className={`h-4 rounded-sm ${
                  n <= (field.span ?? 12)
                    ? "bg-[var(--color-primary)]"
                    : "bg-[var(--ds-border)] hover:bg-[var(--ds-text-subtle)]"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Options — only for select/multi-select without optionsSource */}
      {hasOptions && !field.optionsSource && (
        <label className="flex flex-col gap-1">
          <FormLabelText>
            {m.options}
          </FormLabelText>
          <textarea
            rows={4}
            value={(field.options ?? []).join("\n")}
            onChange={(e) => {
              const lines = e.target.value.split("\n").filter((l) => l.trim() !== "");
              set("options", lines.length > 0 ? lines : undefined);
            }}
            placeholder={m.optionsHint}
            className="px-3 py-1.5 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
          />
          <span className="text-xs text-[var(--ds-text-subtle)]">{m.optionsHint}</span>
        </label>
      )}

      {/* Rows — only for textarea and richtext */}
      {hasRows && (
        <label className="flex flex-col gap-1">
          <FormLabelText>
            {m.rows}
          </FormLabelText>
          <input
            type="number"
            min={1}
            max={30}
            value={field.rows ?? ""}
            onChange={(e) => {
              const val = e.target.value !== "" ? Number(e.target.value) : undefined;
              set("rows", val);
            }}
            placeholder={isRichText ? "8" : "4"}
            className="h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] placeholder:opacity-40 focus:outline-none focus:border-[var(--color-primary)]"
          />
        </label>
      )}

      {/* Button type — only for button fields */}
      {isButton && (
        <div className="flex flex-col gap-1">
          <FormLabelText>
            {m.buttonType}
          </FormLabelText>
          <div className="flex flex-col gap-1.5">
            {(
              [
                { value: "button", label: m.buttonTypeButton },
                { value: "submit", label: m.buttonTypeSubmit },
                { value: "reset", label: m.buttonTypeReset },
              ] as { value: "button" | "submit" | "reset"; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => set("buttonType", value)}
                className={`h-8 rounded-control border text-xs font-medium ${
                  (field.buttonType ?? "button") === value
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

      {/* Button width */}
      {isButton && (
        <div className="flex flex-col gap-1">
          <FormLabelText>
            {m.buttonWidth}
          </FormLabelText>
          <div className="flex gap-1.5">
            {(
              [
                { value: "automatic", label: m.buttonWidthAutomatic },
                { value: "full", label: m.buttonWidthFull },
              ] as { value: "automatic" | "full"; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => set("buttonWidth", value)}
                className={`flex-1 h-8 rounded-control border text-xs font-medium ${
                  (field.buttonWidth ?? "automatic") === value
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

      {/* Button alignment */}
      {isButton && (
        <div className="flex flex-col gap-1">
          <FormLabelText>
            {m.buttonAlign}
          </FormLabelText>
          <div className="flex gap-1.5">
            {(
              [
                { value: "left", label: m.buttonAlignLeft },
                { value: "center", label: m.buttonAlignCenter },
                { value: "right", label: m.buttonAlignRight },
              ] as { value: "left" | "center" | "right"; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => set("buttonAlign", value)}
                className={`flex-1 h-8 rounded-control border text-xs font-medium ${
                  (field.buttonAlign ?? "left") === value
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

      {/* Button icon picker */}
      {isButton && (
        <Suspense
          fallback={
            <div className="h-48 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] animate-pulse" />
          }
        >
          <IconPicker
            value={field.buttonIcon}
            onChange={(name) => set("buttonIcon", name)}
            noneLabel={m.buttonIconNone}
            label={m.buttonIcon}
          />
        </Suspense>
      )}

      {/* Button display mode — only shown when an icon is selected */}
      {isButton && field.buttonIcon && (
        <div className="flex flex-col gap-1">
          <FormLabelText>
            {m.buttonDisplay}
          </FormLabelText>
          <div className="flex gap-1.5">
            {(
              [
                { value: "text", label: m.buttonDisplayText },
                { value: "icon", label: m.buttonDisplayIcon },
                { value: "both", label: m.buttonDisplayBoth },
              ] as { value: "text" | "icon" | "both"; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => set("buttonDisplay", value)}
                className={`flex-1 h-8 rounded-control border text-xs font-medium ${
                  (field.buttonDisplay ?? "both") === value
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

      {/* Button action — only for buttonType === "button" */}
      {isButton && (field.buttonType ?? "button") === "button" && (
        <div className="flex flex-col gap-1">
          <FormLabelText>
            {m.buttonAction}
          </FormLabelText>
          <div className="flex flex-col gap-1.5">
            {(
              [
                { value: undefined, label: m.buttonActionNone },
                { value: "open-url", label: m.buttonActionOpenUrl },
                { value: "copy-clipboard", label: m.buttonActionCopyClipboard },
                { value: "clear-field", label: m.buttonActionClearField },
              ] as { value: ButtonActionType | undefined; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value ?? "none"}
                type="button"
                onClick={() => {
                  if (value === undefined) {
                    set("buttonAction", undefined);
                  } else {
                    set("buttonAction", {
                      type: value,
                      sourceFieldId: field.buttonAction?.sourceFieldId ?? "",
                    });
                  }
                }}
                className={`h-8 rounded-control border text-xs font-medium ${
                  (field.buttonAction?.type ?? undefined) === value
                    ? "border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
                    : "border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-[var(--ds-text)] hover:border-[var(--color-primary)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {field.buttonAction && (
            <label className="flex flex-col gap-1 mt-1">
              <span className="text-xs text-[var(--ds-text-subtle)]">
                {m.buttonActionSourceField}
              </span>
              <select
                value={field.buttonAction.sourceFieldId}
                onChange={(e) => {
                  if (field.buttonAction) {
                    set("buttonAction", {
                      ...field.buttonAction,
                      sourceFieldId: e.target.value,
                    });
                  }
                }}
                className="h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">—</option>
                {allFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {/* Validation min/max — only for text/textarea */}
      {hasValidationMinMax && (
        <div className="flex flex-col gap-2">
          <FormLabelText>
            {m.validation}
          </FormLabelText>
          <div className="flex gap-2">
            <label className="flex-1 min-w-0 flex flex-col gap-1">
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
            <label className="flex-1 min-w-0 flex flex-col gap-1">
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
