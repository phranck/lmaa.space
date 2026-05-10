import { useEffect, useMemo, useState } from "react";

import type { MarkdownWidget, MarkdownWidgetsConfig } from "@lmaa/contracts";

import { Card } from "@/components/ui/Card.tsx";
import {
  CreateActionButton,
  SaveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import {
  PageBody,
  PageLayout,
  PageSplitAside,
  PageSplitLayout,
  PageSplitMain,
} from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { createEmptyWidget } from "@/features/system/widget-utils.ts";
import { WidgetEditorPanel } from "@/features/system/WidgetEditorPanel.tsx";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave.ts";

import { useMarkdownWidgets, useSaveMarkdownWidgets } from "./hooks/useMarkdownWidgets.ts";

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

  const widgetTypeOptions = useMemo(
    () =>
      [
        { value: "html", label: widgetMessages.types.html.label },
        { value: "iframe", label: widgetMessages.types.iframe.label },
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
        <SaveActionButton
          onClick={handleSave}
          disabled={!config || save.isPending}
          busy={save.isPending}
          label={savedOk ? common.saved : save.isPending ? common.saving : common.save}
          size="control"
        />
      </PageHeader>

      <PageBody>
        {isLoading || !config ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="size-6 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
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
                  <CreateActionButton
                    onClick={handleAddWidget}
                    label={widgetMessages.newWidget}
                  />
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
                          className={`w-full rounded-card border px-3 py-3 text-left ${
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
                <WidgetEditorPanel
                  widget={selectedWidget}
                  onUpdate={updateWidget}
                  onDelete={handleDeleteWidget}
                  onKeyChange={setSelectedKey}
                />
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
