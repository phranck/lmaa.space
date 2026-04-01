import type { MarkdownWidget } from "@lmaa/contracts";

export const EMPTY_CSP = {
  scriptSrc: [] as string[],
  styleSrc: [] as string[],
  imgSrc: [] as string[],
  connectSrc: [] as string[],
  frameSrc: [] as string[],
  formAction: [] as string[],
  fontSrc: [] as string[],
};

export const fieldLabelClass =
  "px-1 text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-subtle)]";
export const fieldHintClass = "px-1 text-xs leading-5 text-[var(--ds-text-subtle)]";
export const textInputClass =
  "h-9 w-full rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] px-3 text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:border-[var(--color-primary)]";
export const textAreaClass =
  "w-full rounded-[calc(var(--radius-control)-2px)] border border-[var(--ds-border)] bg-[var(--ds-input-bg)] px-3 py-1.5 text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:border-[var(--color-primary)]";
export const readOnlyTextAreaClass =
  "w-full rounded-[calc(var(--radius-control)-2px)] border border-[var(--ds-border)] bg-[var(--ds-bg)] px-3 py-2.5 font-mono text-xs text-[var(--ds-text-muted)]";
export const checkboxRowClass =
  "flex h-9 items-center gap-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] px-3";
export const insetCardClass =
  "space-y-3 rounded-[calc(var(--radius-card)-12px)] border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] p-3";

export function createWidgetKey(widgets: MarkdownWidget[]): string {
  let index = widgets.length + 1;
  while (widgets.some((widget) => widget.key === `widget-${index}`)) {
    index += 1;
  }
  return `widget-${index}`;
}

export function createEmptyWidget(widgets: MarkdownWidget[]): MarkdownWidget {
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

export function parseOriginsInput(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function joinOrigins(values: string[]): string {
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

export function getAutoOrigins(widget: MarkdownWidget) {
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
