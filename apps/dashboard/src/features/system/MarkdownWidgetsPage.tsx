import { DownloadIcon, PlusCircleIcon, TrashIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import type { MarkdownWidget, MarkdownWidgetsConfig } from "@lmaa/contracts";

import { Card } from "@/components/ui/Card.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import {
  PageBody,
  PageLayout,
  PageSplitAside,
  PageSplitLayout,
  PageSplitMain,
} from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave.ts";

import { useMarkdownWidgets, useSaveMarkdownWidgets } from "./hooks/useMarkdownWidgets.ts";

const EMPTY_CSP = {
  scriptSrc: [],
  styleSrc: [],
  imgSrc: [],
  connectSrc: [],
  frameSrc: [],
  formAction: [],
  fontSrc: [],
};

const fieldLabelClass =
  "px-1 text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-subtle)]";
const fieldHintClass = "px-1 text-xs leading-5 text-[var(--ds-text-subtle)]";
const textInputClass =
  "h-9 w-full rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] px-3 text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:border-[var(--color-primary)]";
const textAreaClass =
  "w-full rounded-[calc(var(--radius-control)-2px)] border border-[var(--ds-border)] bg-[var(--ds-input-bg)] px-3 py-1.5 text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:border-[var(--color-primary)]";
const readOnlyTextAreaClass =
  "w-full rounded-[calc(var(--radius-control)-2px)] border border-[var(--ds-border)] bg-[var(--ds-bg)] px-3 py-2.5 font-mono text-xs text-[var(--ds-text-muted)]";
const checkboxRowClass =
  "flex h-9 items-center gap-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] px-3";
const insetCardClass =
  "space-y-3 rounded-[calc(var(--radius-card)-12px)] border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] p-3";

function createWidgetKey(widgets: MarkdownWidget[]): string {
  let index = widgets.length + 1;
  while (widgets.some((widget) => widget.key === `widget-${index}`)) {
    index += 1;
  }
  return `widget-${index}`;
}

function createEmptyWidget(widgets: MarkdownWidget[]): MarkdownWidget {
  const key = createWidgetKey(widgets);
  return {
    key,
    label: `Widget ${widgets.length + 1}`,
    description: "",
    enabled: true,
    type: "html",
    defaultHeight: 320,
    snippetHtml: "",
    iframeUrl: "",
    csp: EMPTY_CSP,
  };
}

function parseOriginsInput(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function joinOrigins(values: string[]): string {
  return values.join("\n");
}

function getOriginsFromText(value: string): string[] {
  const matches = value.match(/https?:\/\/[^\s"'`<>)]+/g) ?? [];
  const origins = matches
    .map((entry) => {
      try {
        return new URL(entry).origin;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is string => Boolean(entry));

  return [...new Set(origins)];
}

function getAutoOrigins(widget: MarkdownWidget) {
  if (widget.type === "iframe" && widget.iframeUrl) {
    try {
      const origin = new URL(widget.iframeUrl).origin;
      return {
        scriptSrc: [] as string[],
        styleSrc: [] as string[],
        imgSrc: [] as string[],
        connectSrc: [] as string[],
        frameSrc: [origin],
        formAction: [] as string[],
        fontSrc: [] as string[],
      };
    } catch {
      return EMPTY_CSP;
    }
  }

  const origins = getOriginsFromText(widget.snippetHtml);
  return {
    scriptSrc: origins,
    styleSrc: origins,
    imgSrc: origins,
    connectSrc: origins,
    frameSrc: origins,
    formAction: origins,
    fontSrc: origins,
  };
}

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
      <span className={fieldLabelClass}>{label}</span>
      {children}
      {hint ? <p className={fieldHintClass}>{hint}</p> : null}
    </label>
  );
}

export function MarkdownWidgetsPage() {
  const { messages } = useI18n();
  const common = messages.common;
  const widgetMessages = messages.content.markdownWidgets;
  const { data, isLoading } = useMarkdownWidgets();
  const save = useSaveMarkdownWidgets();
  const [config, setConfig] = useState<MarkdownWidgetsConfig | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    if (data && config === null) {
      setConfig(data);
      setSelectedKey(data.widgets[0]?.key ?? null);
    }
  }, [data, config]);

  const selectedWidget = useMemo(
    () => config?.widgets.find((widget) => widget.key === selectedKey) ?? null,
    [config, selectedKey],
  );

  const autoOrigins = useMemo(
    () => (selectedWidget ? getAutoOrigins(selectedWidget) : EMPTY_CSP),
    [selectedWidget],
  );
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

  function updateWidget(nextKey: string, updater: (widget: MarkdownWidget) => MarkdownWidget) {
    setConfig((current) => {
      if (!current) return current;
      return {
        widgets: current.widgets.map((widget) =>
          widget.key === nextKey ? updater(widget) : widget,
        ),
      };
    });
    setSavedOk(false);
  }

  function handleAddWidget() {
    setConfig((current) => {
      const base = current ?? { widgets: [] };
      const widget = createEmptyWidget(base.widgets);
      setSelectedKey(widget.key);
      return { widgets: [...base.widgets, widget] };
    });
    setSavedOk(false);
  }

  function handleDeleteWidget(key: string) {
    setConfig((current) => {
      if (!current) return current;
      const widgets = current.widgets.filter((widget) => widget.key !== key);
      setSelectedKey(widgets[0]?.key ?? null);
      return { widgets };
    });
    setSavedOk(false);
  }

  function handleSave() {
    if (!config) return;
    save.mutate(config, {
      onSuccess: () => {
        setSavedOk(true);
      },
    });
  }

  useKeyboardSave(handleSave, Boolean(config) && !save.isPending);

  return (
    <PageLayout>
      <PageHeader title={widgetMessages.title}>
        <button
          type="button"
          onClick={handleSave}
          disabled={!config || save.isPending}
          className="flex items-center gap-2 h-8 min-w-8 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-60 transition-colors"
        >
          <DownloadIcon weight="duotone" className="w-3.5 h-3.5" />
          {savedOk ? common.saved : save.isPending ? common.saving : common.save}
        </button>
      </PageHeader>

      <PageBody>
        {isLoading || !config ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
          </div>
        ) : (
          <PageSplitLayout columnsClassName="xl:grid-cols-[30rem_minmax(0,1fr)]">
            <PageSplitAside>
              <Card className="h-full p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--ds-text)]">
                      {widgetMessages.widgetsTitle}
                    </h2>
                    <p className="text-xs text-[var(--ds-text-muted)]">
                      {widgetMessages.widgetsHint}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddWidget}
                    className="inline-flex h-8 items-center gap-1.5 rounded-control border border-[var(--ds-border)] px-3 text-xs font-medium text-[var(--ds-text)] hover:border-[var(--ds-border-strong)]"
                  >
                    <PlusCircleIcon weight="duotone" className="w-3.5 h-3.5" />
                    {widgetMessages.newWidget}
                  </button>
                </div>

                <div className="space-y-2">
                  {config.widgets.length === 0 ? (
                    <div className="rounded-card border border-dashed border-[var(--ds-border)] px-3 py-4 text-xs leading-5 text-[var(--ds-text-muted)]">
                      {widgetMessages.emptyTitle} {widgetMessages.emptyHint}
                    </div>
                  ) : (
                    config.widgets.map((widget) => {
                      const isSelected = widget.key === selectedKey;
                      const typeLabel = widgetTypeOptions.find(
                        (option) => option.value === widget.type,
                      )?.label;
                      return (
                        <button
                          key={widget.key}
                          type="button"
                          onClick={() => setSelectedKey(widget.key)}
                          className={`w-full rounded-card border px-3 py-3 text-left transition-colors ${
                            isSelected
                              ? "border-[var(--color-primary)] bg-[var(--ds-bg-elevated)]"
                              : "border-[var(--ds-border)] hover:border-[var(--ds-border-strong)]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-sm font-medium text-[var(--ds-text)]">
                              {widget.label}
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ${
                                widget.enabled
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-stone-500/10 text-stone-400"
                              }`}
                            >
                              {widget.enabled ? widgetMessages.active : widgetMessages.inactive}
                            </span>
                          </div>
                          <div className="mt-1 truncate font-mono text-[0.6875rem] text-[var(--ds-text-muted)]">
                            [[widget:{widget.key}]]
                          </div>
                          <div className="mt-1 text-[0.6875rem] text-[var(--ds-text-muted)]">
                            {typeLabel}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </Card>
            </PageSplitAside>

            <PageSplitMain>
              {selectedWidget ? (
                <div className="space-y-4">
                  <Card className="p-4 space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-[var(--ds-text)]">
                          {selectedWidget.label}
                        </h2>
                        <p className="mt-1 text-sm text-[var(--ds-text-muted)]">
                          {widgetMessages.markdownLabel}:
                          <span className="ml-2 rounded bg-[var(--ds-bg-elevated)] px-2 py-1 font-mono text-xs">
                            [[widget:{selectedWidget.key}]]
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteWidget(selectedWidget.key)}
                        className="inline-flex h-9 items-center gap-2 rounded-control border border-[var(--ds-btn-danger-border)] px-3 text-sm font-medium text-[var(--ds-btn-danger-text)] hover:bg-[var(--ds-btn-danger-hover-bg)]"
                      >
                        <TrashIcon weight="duotone" className="w-3.5 h-3.5" />
                        {widgetMessages.deleteWidget}
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label={widgetMessages.keyLabel} hint={widgetMessages.keyHint}>
                        <input
                          value={selectedWidget.key}
                          onChange={(event) => {
                            const nextKey = event.target.value.toLowerCase();
                            const previousKey = selectedWidget.key;
                            updateWidget(previousKey, (widget) => ({ ...widget, key: nextKey }));
                            setSelectedKey(nextKey);
                          }}
                          className={textInputClass}
                        />
                      </Field>

                      <Field label={widgetMessages.nameLabel}>
                        <input
                          value={selectedWidget.label}
                          onChange={(event) =>
                            updateWidget(selectedWidget.key, (widget) => ({
                              ...widget,
                              label: event.target.value,
                            }))
                          }
                          className={textInputClass}
                        />
                      </Field>

                      <Field label={widgetMessages.typeLabel} hint={widgetMessages.typeHint}>
                        <select
                          value={selectedWidget.type}
                          onChange={(event) =>
                            updateWidget(selectedWidget.key, (widget) => ({
                              ...widget,
                              type: event.target.value as MarkdownWidget["type"],
                            }))
                          }
                          className={textInputClass}
                        >
                          {widgetTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field
                        label={widgetMessages.defaultHeightLabel}
                        hint={widgetMessages.defaultHeightHint}
                      >
                        <input
                          type="number"
                          min={80}
                          max={2400}
                          value={selectedWidget.defaultHeight}
                          onChange={(event) =>
                            updateWidget(selectedWidget.key, (widget) => ({
                              ...widget,
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
                        checked={selectedWidget.enabled}
                        onChange={(event) =>
                          updateWidget(selectedWidget.key, (widget) => ({
                            ...widget,
                            enabled: event.target.checked,
                          }))
                        }
                      />
                      <span className="text-sm text-[var(--ds-text)]">
                        {widgetMessages.enabledLabel}
                      </span>
                    </label>

                    <Field
                      label={widgetMessages.descriptionLabel}
                      hint={widgetMessages.descriptionHint}
                    >
                      <textarea
                        rows={3}
                        value={selectedWidget.description}
                        onChange={(event) =>
                          updateWidget(selectedWidget.key, (widget) => ({
                            ...widget,
                            description: event.target.value,
                          }))
                        }
                        className={textAreaClass}
                      />
                    </Field>

                    <div className={insetCardClass}>
                      <h3 className="text-sm font-semibold text-[var(--ds-text)]">
                        {widgetMessages.configurationTitle}
                      </h3>
                      <p className={fieldHintClass}>
                        {
                          widgetTypeOptions.find((option) => option.value === selectedWidget.type)
                            ?.description
                        }
                      </p>

                      {selectedWidget.type === "html" ? (
                        <Field
                          label={widgetMessages.types.html.snippetLabel}
                          hint={widgetMessages.types.html.snippetHint}
                        >
                          <textarea
                            rows={14}
                            value={selectedWidget.snippetHtml}
                            onChange={(event) =>
                              updateWidget(selectedWidget.key, (widget) => ({
                                ...widget,
                                snippetHtml: event.target.value,
                              }))
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
                            value={selectedWidget.iframeUrl}
                            onChange={(event) =>
                              updateWidget(selectedWidget.key, (widget) => ({
                                ...widget,
                                iframeUrl: event.target.value,
                              }))
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

                    <details className="rounded-card border border-[var(--ds-border)] px-4 py-3">
                      <summary className="cursor-pointer text-sm font-medium text-[var(--ds-text)]">
                        {widgetMessages.expertModeTitle}
                      </summary>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <Field label={widgetMessages.additionalScriptSrcOrigins}>
                          <textarea
                            rows={4}
                            value={joinOrigins(selectedWidget.csp.scriptSrc)}
                            onChange={(event) =>
                              updateWidget(selectedWidget.key, (widget) => ({
                                ...widget,
                                csp: {
                                  ...widget.csp,
                                  scriptSrc: parseOriginsInput(event.target.value),
                                },
                              }))
                            }
                            className={`${textAreaClass} font-mono text-xs`}
                          />
                        </Field>
                        <Field label={widgetMessages.additionalStyleSrcOrigins}>
                          <textarea
                            rows={4}
                            value={joinOrigins(selectedWidget.csp.styleSrc)}
                            onChange={(event) =>
                              updateWidget(selectedWidget.key, (widget) => ({
                                ...widget,
                                csp: {
                                  ...widget.csp,
                                  styleSrc: parseOriginsInput(event.target.value),
                                },
                              }))
                            }
                            className={`${textAreaClass} font-mono text-xs`}
                          />
                        </Field>
                        <Field label={widgetMessages.additionalImgSrcOrigins}>
                          <textarea
                            rows={4}
                            value={joinOrigins(selectedWidget.csp.imgSrc)}
                            onChange={(event) =>
                              updateWidget(selectedWidget.key, (widget) => ({
                                ...widget,
                                csp: {
                                  ...widget.csp,
                                  imgSrc: parseOriginsInput(event.target.value),
                                },
                              }))
                            }
                            className={`${textAreaClass} font-mono text-xs`}
                          />
                        </Field>
                        <Field label={widgetMessages.additionalConnectSrcOrigins}>
                          <textarea
                            rows={4}
                            value={joinOrigins(selectedWidget.csp.connectSrc)}
                            onChange={(event) =>
                              updateWidget(selectedWidget.key, (widget) => ({
                                ...widget,
                                csp: {
                                  ...widget.csp,
                                  connectSrc: parseOriginsInput(event.target.value),
                                },
                              }))
                            }
                            className={`${textAreaClass} font-mono text-xs`}
                          />
                        </Field>
                        <Field label={widgetMessages.additionalFrameSrcOrigins}>
                          <textarea
                            rows={4}
                            value={joinOrigins(selectedWidget.csp.frameSrc)}
                            onChange={(event) =>
                              updateWidget(selectedWidget.key, (widget) => ({
                                ...widget,
                                csp: {
                                  ...widget.csp,
                                  frameSrc: parseOriginsInput(event.target.value),
                                },
                              }))
                            }
                            className={`${textAreaClass} font-mono text-xs`}
                          />
                        </Field>
                        <Field label={widgetMessages.additionalFormActionOrigins}>
                          <textarea
                            rows={4}
                            value={joinOrigins(selectedWidget.csp.formAction)}
                            onChange={(event) =>
                              updateWidget(selectedWidget.key, (widget) => ({
                                ...widget,
                                csp: {
                                  ...widget.csp,
                                  formAction: parseOriginsInput(event.target.value),
                                },
                              }))
                            }
                            className={`${textAreaClass} font-mono text-xs`}
                          />
                        </Field>
                        <Field label={widgetMessages.additionalFontSrcOrigins}>
                          <textarea
                            rows={4}
                            value={joinOrigins(selectedWidget.csp.fontSrc)}
                            onChange={(event) =>
                              updateWidget(selectedWidget.key, (widget) => ({
                                ...widget,
                                csp: {
                                  ...widget.csp,
                                  fontSrc: parseOriginsInput(event.target.value),
                                },
                              }))
                            }
                            className={`${textAreaClass} font-mono text-xs`}
                          />
                        </Field>
                      </div>
                    </details>
                  </Card>

                  <Card className="p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-[var(--ds-text)]">
                      {widgetMessages.usageTitle}
                    </h3>
                    <p className={`${fieldHintClass} leading-5`}>
                      {widgetMessages.widgetUsage}:
                      <span className="ml-2 font-mono">[[widget:{selectedWidget.key}]]</span>
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
              ) : (
                <Card className="flex min-h-[24rem] items-center justify-center p-6 text-sm text-[var(--ds-text-muted)]">
                  {widgetMessages.emptySelection}
                </Card>
              )}
            </PageSplitMain>
          </PageSplitLayout>
        )}
      </PageBody>
    </PageLayout>
  );
}
