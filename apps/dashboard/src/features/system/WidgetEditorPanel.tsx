import { TrashIcon } from "@phosphor-icons/react";
import { useMemo } from "react";

import type { MarkdownWidget } from "@lmaa/contracts";

import { Card } from "@/components/ui/Card.tsx";
import { DashboardCombobox } from "@/components/ui/DashboardControls.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  checkboxRowClass,
  fieldHintClass,
  getAutoOrigins,
  insetCardClass,
  joinOrigins,
  parseOriginsInput,
  readOnlyTextAreaClass,
  textAreaClass,
  textInputClass,
} from "@/features/system/widget-utils.ts";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-subtle)]">{label}</span>
      {children}
      {hint ? <p className={fieldHintClass}>{hint}</p> : null}
    </label>
  );
}

interface WidgetEditorPanelProps {
  widget: MarkdownWidget;
  onUpdate: (key: string, updater: (widget: MarkdownWidget) => MarkdownWidget) => void;
  onDelete: (key: string) => void;
  onKeyChange: (newKey: string) => void;
}

export function WidgetEditorPanel({ widget, onUpdate, onDelete, onKeyChange }: WidgetEditorPanelProps) {
  const { messages } = useI18n();
  const widgetMessages = messages.content.markdownWidgets;

  const autoOrigins = useMemo(() => getAutoOrigins(widget), [widget]);
  const widgetTypeOptions = useMemo(
    () =>
      [
        {
          value: "html",
          label: widgetMessages.types.html.label,
          description: widgetMessages.types.html.description,
        },
        {
          value: "iframe",
          label: widgetMessages.types.iframe.label,
          description: widgetMessages.types.iframe.description,
        },
      ] as const,
    [widgetMessages],
  );

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ds-text)]">
              {widget.label}
            </h2>
            <p className="mt-1 text-sm text-[var(--ds-text-muted)]">
              {widgetMessages.markdownLabel}:
              <span className="ml-2 rounded bg-[var(--ds-bg-elevated)] px-2 py-1 font-mono text-xs">
                [[widget:{widget.key}]]
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDelete(widget.key)}
            className="inline-flex h-9 items-center gap-2 rounded-control border border-[var(--ds-btn-danger-border)] px-3 text-sm font-medium text-[var(--ds-btn-danger-text)] hover:bg-[var(--ds-btn-danger-hover-bg)]"
          >
            <TrashIcon weight="duotone" className="size-3.5" />
            {widgetMessages.deleteWidget}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={widgetMessages.keyLabel} hint={widgetMessages.keyHint}>
            <input
              value={widget.key}
              onChange={(event) => {
                const nextKey = event.target.value.toLowerCase();
                const previousKey = widget.key;
                onUpdate(previousKey, (w) => ({ ...w, key: nextKey }));
                onKeyChange(nextKey);
              }}
              className={textInputClass}
            />
          </Field>

          <Field label={widgetMessages.nameLabel}>
            <input
              value={widget.label}
              onChange={(event) =>
                onUpdate(widget.key, (w) => ({ ...w, label: event.target.value }))
              }
              className={textInputClass}
            />
          </Field>

          <DashboardCombobox
            label={widgetMessages.typeLabel}
            hint={widgetMessages.typeHint}
            value={widget.type}
            onValueChange={(value) =>
              onUpdate(widget.key, (w) => ({
                ...w,
                type: value as MarkdownWidget["type"],
              }))
            }
            options={widgetTypeOptions.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />

          <Field label={widgetMessages.defaultHeightLabel} hint={widgetMessages.defaultHeightHint}>
            <input
              type="number"
              min={80}
              max={2400}
              value={widget.defaultHeight}
              onChange={(event) =>
                onUpdate(widget.key, (w) => ({
                  ...w,
                  defaultHeight: Number(event.target.value) || 320,
                }))
              }
              className={textInputClass}
            />
          </Field>
        </div>

        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={widget.enabled}
            onChange={(event) =>
              onUpdate(widget.key, (w) => ({ ...w, enabled: event.target.checked }))
            }
          />
          <span className="text-sm text-[var(--ds-text)]">{widgetMessages.enabledLabel}</span>
        </label>

        <Field label={widgetMessages.descriptionLabel} hint={widgetMessages.descriptionHint}>
          <textarea
            rows={3}
            value={widget.description}
            onChange={(event) =>
              onUpdate(widget.key, (w) => ({ ...w, description: event.target.value }))
            }
            className={textAreaClass}
          />
        </Field>

        <div className={insetCardClass}>
          <h3 className="text-sm font-semibold text-[var(--ds-text)]">
            {widgetMessages.configurationTitle}
          </h3>
          <p className={fieldHintClass}>
            {widgetTypeOptions.find((option) => option.value === widget.type)?.description}
          </p>

          {widget.type === "html" ? (
            <Field
              label={widgetMessages.types.html.snippetLabel}
              hint={widgetMessages.types.html.snippetHint}
            >
              <textarea
                rows={14}
                value={widget.snippetHtml}
                onChange={(event) =>
                  onUpdate(widget.key, (w) => ({ ...w, snippetHtml: event.target.value }))
                }
                className={`${textAreaClass} font-mono text-xs`}
              />
            </Field>
          ) : (
            <Field
              label={widgetMessages.types.iframe.urlLabel}
              hint={widgetMessages.types.iframe.urlHint}
            >
              <input
                type="url"
                value={widget.iframeUrl}
                onChange={(event) =>
                  onUpdate(widget.key, (w) => ({ ...w, iframeUrl: event.target.value }))
                }
                className={textInputClass}
              />
            </Field>
          )}
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--ds-text)]">
            {widgetMessages.autoSecurityTitle}
          </h3>
          <p className={fieldHintClass}>{widgetMessages.autoSecurityHint}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label={widgetMessages.detectedScriptStyleImageOrigins}>
            <textarea
              rows={4}
              readOnly
              value={joinOrigins([
                ...autoOrigins.scriptSrc,
                ...autoOrigins.styleSrc,
                ...autoOrigins.imgSrc,
              ])}
              className={readOnlyTextAreaClass}
            />
          </Field>
          <Field label={widgetMessages.detectedFrameConnectFormOrigins}>
            <textarea
              rows={4}
              readOnly
              value={joinOrigins([
                ...autoOrigins.frameSrc,
                ...autoOrigins.connectSrc,
                ...autoOrigins.formAction,
              ])}
              className={readOnlyTextAreaClass}
            />
          </Field>
        </div>

        <CspExpertSection widget={widget} onUpdate={onUpdate} widgetMessages={widgetMessages} />
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="text-sm font-semibold text-[var(--ds-text)]">
          {widgetMessages.usageTitle}
        </h3>
        <p className={`${fieldHintClass} leading-5`}>
          {widgetMessages.widgetUsage}:
          <span className="ml-2 font-mono">[[widget:{widget.key}]]</span>
        </p>
        <p className={`${fieldHintClass} leading-5`}>
          {widgetMessages.imageUsage}:
          <span className="ml-2 font-mono">
            [[image:/uploads/datei.jpg alt="Alt" width=320]]
          </span>
        </p>
        <p className={`${fieldHintClass} leading-5`}>
          {widgetMessages.pdfUsage}:
          <span className="ml-2 font-mono">
            {`[[pdf:/uploads/datei.pdf label="${widgetMessages.pdfExampleLabel}"]]`}
          </span>
        </p>
      </Card>
    </div>
  );
}

type CspField = "scriptSrc" | "styleSrc" | "imgSrc" | "connectSrc" | "frameSrc" | "formAction" | "fontSrc";

function CspExpertSection({
  widget,
  onUpdate,
  widgetMessages,
}: {
  widget: MarkdownWidget;
  onUpdate: (key: string, updater: (widget: MarkdownWidget) => MarkdownWidget) => void;
  widgetMessages: ReturnType<typeof useI18n>["messages"]["content"]["markdownWidgets"];
}) {
  const cspFields: { field: CspField; label: string }[] = [
    { field: "scriptSrc", label: widgetMessages.additionalScriptSrcOrigins },
    { field: "styleSrc", label: widgetMessages.additionalStyleSrcOrigins },
    { field: "imgSrc", label: widgetMessages.additionalImgSrcOrigins },
    { field: "connectSrc", label: widgetMessages.additionalConnectSrcOrigins },
    { field: "frameSrc", label: widgetMessages.additionalFrameSrcOrigins },
    { field: "formAction", label: widgetMessages.additionalFormActionOrigins },
    { field: "fontSrc", label: widgetMessages.additionalFontSrcOrigins },
  ];

  return (
    <details className="rounded-card border border-[var(--ds-border)] px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-[var(--ds-text)]">
        {widgetMessages.expertModeTitle}
      </summary>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {cspFields.map(({ field, label }) => (
          <Field key={field} label={label}>
            <textarea
              rows={4}
              value={joinOrigins(widget.csp[field])}
              onChange={(event) =>
                onUpdate(widget.key, (w) => ({
                  ...w,
                  csp: {
                    ...w.csp,
                    [field]: parseOriginsInput(event.target.value),
                  },
                }))
              }
              className={`${textAreaClass} font-mono text-xs`}
            />
          </Field>
        ))}
      </div>
    </details>
  );
}
