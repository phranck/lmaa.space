import { CheckIcon, CopyIcon, XIcon } from "@phosphor-icons/react";
import * as React from "react";
import { createPortal } from "react-dom";

import "./MarkdownShortcodeReference.css";

import {
  MARKDOWN_SHORTCODE_DEFINITIONS,
  SITE_VARIABLES,
  SITE_VARIABLE_NAMES,
  type MarkdownShortcodeDefinition,
  type MarkdownShortcodeDefinitionToken,
  type MarkdownShortcodeParamDefinition,
  type SiteVariableName,
} from "@lmaa/shared";

/**
 * What the panel is describing on its right-hand side.
 *
 * Two kinds share one column because they answer the same question from the
 * writer: what may I put here, and how is it spelt.
 */
type HelpSelection =
  | { kind: "shortcode"; token: MarkdownShortcodeDefinitionToken }
  | { kind: "variable"; name: SiteVariableName };

/**
 * How long the copy confirmation stays visible, in milliseconds.
 *
 * The mark arrives at once and drains away afterwards, so the transition sits
 * on the resting state rather than on the confirmed one.
 */
const COPY_FEEDBACK_MS = 1600;

/**
 * Pixel values already measured, keyed by the property they came from.
 *
 * Measuring appends an element and reads its width back, which costs a layout.
 * The panel renders on every click in it, and the spacing tokens do not move
 * whilst a page is open, so each one is measured once.
 */
const pixelCache = new Map<string, string>();

/**
 * Resolves a CSS length to pixels, by asking the page.
 *
 * A default that lives in the stylesheet is named in the registry by its custom
 * property rather than by its value, so the reference cannot drift from what
 * the page renders. This is what turns the property back into a figure, and it
 * reports pixels whatever unit the token is written in.
 *
 * The dashboard and the site load the same tokens at the same root size, so a
 * figure measured here is the figure the page uses.
 *
 * @param value - Any CSS length, such as `var(--ds-space-sm)`.
 * @returns The length in pixels, or `null` where there is no document to ask.
 */
function resolveLengthInPixels(value: string): string | null {
  const cached = pixelCache.get(value);
  if (cached) return cached;
  if (typeof document === "undefined") return null;

  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.width = value;
  document.body.appendChild(probe);
  const width = window.getComputedStyle(probe).width;
  probe.remove();

  if (width === "auto") return null;
  pixelCache.set(value, width);
  return width;
}

/** True for a default written as a custom property rather than as a phrase. */
function isCssToken(value: string): boolean {
  return value.startsWith("var(--");
}

/**
 * States what holds when a parameter is left out.
 *
 * @param param - The parameter.
 * @returns The phrase to show, or `null` where the parameter has no default.
 */
function describeDefault(param: MarkdownShortcodeParamDefinition): string | null {
  if (param.defaultLabel) {
    if (!isCssToken(param.defaultLabel)) return param.defaultLabel;
    return resolveLengthInPixels(param.defaultLabel) ?? param.defaultLabel;
  }

  if (param.defaultValue === undefined) return null;
  if (param.defaultValue === "") return "leer";
  return String(param.defaultValue);
}

/** Describes a parameter's accepted shape in one short phrase. */
function describeType(param: MarkdownShortcodeParamDefinition): string {
  if (param.type === "enum" && param.values) return param.values.join(" | ");
  if (param.type === "integer") {
    if (param.min !== undefined && param.max !== undefined) {
      return `Zahl ${param.min} bis ${param.max}`;
    }
    return "Zahl";
  }
  if (param.type === "boolean") return "Schalter, ohne Wert";
  return "Text";
}

function ParamRow({ param }: { param: MarkdownShortcodeParamDefinition }) {
  const fallback = describeDefault(param);

  return (
    <tr className="border-t border-[var(--ds-rule)] align-top">
      <td className="py-1 pr-3 font-mono text-[var(--ds-text)] whitespace-nowrap">
        {param.name}
        {param.required && (
          <span className="ml-0.5 text-[var(--ds-danger-text)]" title="Pflicht">
            *
          </span>
        )}
      </td>
      <td className="py-1 pr-3 text-[var(--ds-text-muted)]">{param.label ?? ""}</td>
      <td className="py-1 font-mono text-[0.9em] text-[var(--ds-text-hint)]">
        {describeType(param)}
        {param.aliases && param.aliases.length > 0 && (
          <span className="ml-2">auch: {param.aliases.join(", ")}</span>
        )}
        {/* What holds without the parameter, on its own line, because it is the
            answer to a different question from what the parameter accepts. */}
        {fallback && <span className="block">ohne Angabe: {fallback}</span>}
      </td>
    </tr>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => setCopied(true));
      }}
      className="inline-flex items-center gap-1 h-6 px-2 rounded-control border border-[var(--ds-border)] text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] text-[0.6875rem]"
    >
      {copied ? (
        <CheckIcon weight="bold" aria-hidden="true" className="size-3" />
      ) : (
        <CopyIcon weight="duotone" aria-hidden="true" className="size-3" />
      )}
      {copied ? "Kopiert" : "Kopieren"}
    </button>
  );
}

/**
 * One shortcode, with its children indented beneath it.
 *
 * The nesting is drawn rather than described, because a reader looking for
 * `option` needs to see that it lives inside `interval` and nowhere else.
 */
function DefinitionEntry({
  definition,
  depth,
}: {
  definition: MarkdownShortcodeDefinition;
  depth: number;
}) {
  return (
    <div
      className={
        depth > 0
          ? "mt-3 pl-3 border-l border-[var(--ds-rule)]"
          : "mt-5 first:mt-0 pt-5 first:pt-0 border-t first:border-t-0 border-[var(--ds-rule)]"
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-2">
        <code className="font-mono font-semibold text-[var(--ds-text)]">
          [[{definition.token}]]
        </code>
        <span className="text-[var(--ds-text-muted)]">{definition.label}</span>
      </div>
      <p className="mt-1 text-[var(--ds-text-muted)]">{definition.description}</p>

      {definition.params.length > 0 && (
        <table className="mt-2 w-full border-collapse">
          <tbody>
            {definition.params.map((param) => (
              <ParamRow key={param.name} param={param} />
            ))}
          </tbody>
        </table>
      )}

      {definition.tables?.map((table) => (
        <div key={table.caption} className="mt-3">
          <div className="text-[var(--ds-text-hint)]">{table.caption}</div>
          <table className="mt-1 w-full border-collapse">
            <thead>
              <tr className="text-left text-[var(--ds-text-hint)]">
                {table.columns.map((column) => (
                  <th key={column} className="py-1 pr-3 font-normal">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.join("|")} className="border-t border-[var(--ds-rule)] align-top">
                  {row.map((cell, column) => (
                    <td
                      key={table.columns[column] ?? column}
                      className={
                        column === 0
                          ? "py-1 pr-3 font-mono text-[var(--ds-text)]"
                          : "py-1 pr-3 text-[var(--ds-text-muted)]"
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {depth === 0 && definition.examples.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[var(--ds-text-hint)]">Beispiel</span>
            <CopyButton text={definition.examples.join("\n\n")} />
          </div>
          {/* The block scrolls inside itself, because a pre reports the length
              of its longest line as its minimum width and would otherwise widen
              the whole panel. */}
          <pre className="m-0 p-2 rounded-control bg-[var(--ds-surface-inset)] border border-[var(--ds-border-subtle)] overflow-x-auto leading-[1.5]">
            <code className="font-mono">{definition.examples.join("\n\n")}</code>
          </pre>
        </div>
      )}

      {definition.children?.map((child) => (
        <DefinitionEntry key={child.token} definition={child} depth={depth + 1} />
      ))}
    </div>
  );
}

/**
 * Where the panel sits and how large it is, in CSS pixels.
 *
 * Kept in local storage so the reader arranges the help once and finds it there
 * again. On the very first open there is nothing stored and the panel is
 * centred.
 */
/**
 * The list of shortcodes, as the panel's left column.
 *
 * Only the tokens that stand on their own appear here. A child such as `option`
 * is shown with the parent it belongs to, because that is the only place it
 * means anything.
 *
 * @param selected - The token whose description is on the right.
 * @param onSelect - Called with the token the reader picked.
 */
/**
 * What a variable stands for, and how it is written.
 *
 * A variable has no parameters and no children, so it needs far less room than
 * a shortcode. The example is what the dashboard holds for it rather than the
 * figure the site currently shows, because the panel is open whilst somebody
 * writes and the real figure lives on the server.
 */
function VariableEntry({ name }: { name: SiteVariableName }) {
  const variable = SITE_VARIABLES[name];

  return (
    <section>
      <header className="flex items-center gap-2 flex-wrap">
        <code className="font-mono text-[var(--ds-text)] text-[0.8125rem]">{`{${name}}`}</code>
        <CopyButton text={`{${name}}`} />
      </header>
      <p className="mt-2 text-[var(--ds-text-muted)] text-[0.8125rem] leading-relaxed">
        {variable.label}
      </p>
      <p className="mt-2 text-[var(--ds-text-muted)] text-[0.75rem]">
        Beispiel: <span className="font-mono text-[var(--ds-text)]">{variable.example}</span>
      </p>
    </section>
  );
}

function ShortcodeList({
  selected,
  onSelect,
}: {
  selected: HelpSelection;
  onSelect: (selection: HelpSelection) => void;
}) {
  return (
    <nav className="lmaa-help-nav" aria-label="Shortcodes und Variablen">
      {MARKDOWN_SHORTCODE_DEFINITIONS.map((definition) => {
        const current = selected.kind === "shortcode" && selected.token === definition.token;
        return (
          <button
            key={definition.token}
            type="button"
            onClick={() => onSelect({ kind: "shortcode", token: definition.token })}
            data-current={current ? "true" : undefined}
            aria-current={current ? "true" : undefined}
            className="lmaa-help-nav-item"
          >
            <span className="font-mono">[[{definition.token}]]</span>
            <span className="lmaa-help-nav-label">{definition.label}</span>
          </button>
        );
      })}

      {/* The variables share the list because a writer looking for something to
          put in a field does not know in advance which of the two it will be. */}
      <p className="lmaa-help-nav-group">Variablen</p>

      {SITE_VARIABLE_NAMES.map((name) => {
        const current = selected.kind === "variable" && selected.name === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onSelect({ kind: "variable", name })}
            data-current={current ? "true" : undefined}
            aria-current={current ? "true" : undefined}
            className="lmaa-help-nav-item"
          >
            <span className="font-mono">{`{${name}}`}</span>
            <span className="lmaa-help-nav-label">{SITE_VARIABLES[name].label}</span>
          </button>
        );
      })}
    </nav>
  );
}

interface HelpFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

const FRAME_STORAGE_KEY = "lmaa.markdown-help.frame";
// Wide enough that the list keeps its column and the description beside it
// stays readable rather than wrapping every second word.
const MIN_WIDTH = 520;
const MIN_HEIGHT = 260;

/** The edges and corners the panel can be resized from. */
const RESIZE_EDGES = ["n", "s", "e", "w", "nw", "ne", "sw", "se"] as const;

type ResizeEdge = (typeof RESIZE_EDGES)[number];
const DEFAULT_WIDTH = 760;
const DEFAULT_HEIGHT = 560;
const VIEWPORT_MARGIN = 16;

/** Keeps a frame inside the window, so a stored position can never hide it. */
function clampToViewport(frame: HelpFrame): HelpFrame {
  const maxWidth = window.innerWidth - VIEWPORT_MARGIN * 2;
  const maxHeight = window.innerHeight - VIEWPORT_MARGIN * 2;
  const width = Math.min(Math.max(frame.width, MIN_WIDTH), Math.max(maxWidth, MIN_WIDTH));
  const height = Math.min(Math.max(frame.height, MIN_HEIGHT), Math.max(maxHeight, MIN_HEIGHT));

  return {
    width,
    height,
    x: Math.min(Math.max(frame.x, VIEWPORT_MARGIN), window.innerWidth - width - VIEWPORT_MARGIN),
    y: Math.min(Math.max(frame.y, VIEWPORT_MARGIN), window.innerHeight - height - VIEWPORT_MARGIN),
  };
}

/** Reads the stored frame, or centres a default one when there is none. */
function readFrame(): HelpFrame {
  const centred: HelpFrame = {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    x: Math.round((window.innerWidth - DEFAULT_WIDTH) / 2),
    y: Math.round((window.innerHeight - DEFAULT_HEIGHT) / 2),
  };

  try {
    const raw = window.localStorage.getItem(FRAME_STORAGE_KEY);
    if (!raw) return clampToViewport(centred);
    const parsed = JSON.parse(raw) as Partial<HelpFrame>;
    if (
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number" ||
      typeof parsed.width !== "number" ||
      typeof parsed.height !== "number"
    ) {
      return clampToViewport(centred);
    }
    return clampToViewport(parsed as HelpFrame);
  } catch {
    // A corrupt entry is a reason to start over, not to fail.
    return clampToViewport(centred);
  }
}

/** Writes a frame onto the element. The only place that touches its geometry. */
function applyFrame(panel: HTMLElement, frame: HelpFrame) {
  panel.style.setProperty("--lmaa-help-x", `${frame.x}px`);
  panel.style.setProperty("--lmaa-help-y", `${frame.y}px`);
  panel.style.width = `${frame.width}px`;
  panel.style.height = `${frame.height}px`;
}

function writeFrame(frame: HelpFrame) {
  window.localStorage.setItem(FRAME_STORAGE_KEY, JSON.stringify(frame));
}

/**
 * The editor's shortcode reference, as a panel rather than a dialog.
 *
 * It deliberately does not block the editor. Nothing is dimmed behind it, focus
 * is left where it was, and the writer keeps typing whilst reading. That is the
 * difference between help and an interruption.
 *
 * It is rendered into the document rather than into the editor, because the
 * editor clips its own overflow and would cut the panel off.
 *
 * @param open - Whether the panel is shown.
 * @param onClose - Called when the reader dismisses it.
 */
export function MarkdownShortcodeReference({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = React.useRef<HTMLElement | null>(null);
  const frameRef = React.useRef<HelpFrame | null>(null);


  // Which shortcode the right column describes. It survives a close and reopen,
  // so somebody who was reading about one finds it again.
  const [selected, setSelected] = React.useState<HelpSelection>({
    kind: "shortcode",
    token: MARKDOWN_SHORTCODE_DEFINITIONS[0].token,
  });
  const shownDefinition =
    selected.kind === "shortcode"
      ? (MARKDOWN_SHORTCODE_DEFINITIONS.find(
          (definition) => definition.token === selected.token,
        ) ?? MARKDOWN_SHORTCODE_DEFINITIONS[0])
      : null;

  // Places the panel on open, from storage or centred.
  React.useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const frame = readFrame();
    frameRef.current = frame;
    applyFrame(panel, frame);
  }, [open]);

  // Held in a ref so the listener is bound once per open rather than rebound
  // whenever the caller passes a new closure.
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    // Listening on the document rather than trapping focus, so the editor keeps
    // every other key.
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  /**
   * Drags the panel by its header.
   *
   * The offset is written straight onto the element during the move rather than
   * through React state, because a pointer move happens once per frame and a
   * render per frame is exactly what makes a drag feel heavy. State is not
   * involved at all; the frame is committed to storage when the pointer lifts.
   */
  function startDrag(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;

    const panel = panelRef.current;
    const frame = frameRef.current;
    if (!panel || !frame) return;

    // Stops the browser anchoring a text selection on the press. Without it the
    // selection runs across whatever sits behind the panel as the pointer moves.
    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const originX = frame.x;
    const originY = frame.y;

    panel.dataset.dragging = "true";
    document.documentElement.classList.add("lmaa-help-dragging");
    event.currentTarget.setPointerCapture(event.pointerId);

    function onMove(moveEvent: PointerEvent) {
      const next = clampToViewport({
        ...frame!,
        x: originX + moveEvent.clientX - startX,
        y: originY + moveEvent.clientY - startY,
      });
      frameRef.current = next;
      applyFrame(panel!, next);
    }

    function onUp() {
      panel!.removeAttribute("data-dragging");
      document.documentElement.classList.remove("lmaa-help-dragging");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (frameRef.current) writeFrame(frameRef.current);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  /**
   * Resizes the panel from one of its edges or corners.
   *
   * Pulling a north or west edge changes the position as well as the size, so
   * the opposite edge stays where it is. The minimum sizes are enforced here
   * rather than in the stylesheet, so the position cannot run past them either.
   */
  function startResize(event: React.PointerEvent<HTMLElement>, edge: ResizeEdge) {
    if (event.button !== 0) return;

    const panel = panelRef.current;
    const start = frameRef.current;
    if (!panel || !start) return;

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;

    panel.dataset.dragging = "true";
    document.documentElement.classList.add("lmaa-help-dragging");
    event.currentTarget.setPointerCapture(event.pointerId);

    function onMove(moveEvent: PointerEvent) {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const next = { ...start! };

      if (edge.includes("e")) {
        next.width = Math.max(MIN_WIDTH, start!.width + deltaX);
      }
      if (edge.includes("s")) {
        next.height = Math.max(MIN_HEIGHT, start!.height + deltaY);
      }
      if (edge.includes("w")) {
        next.width = Math.max(MIN_WIDTH, start!.width - deltaX);
        next.x = start!.x + (start!.width - next.width);
      }
      if (edge.includes("n")) {
        next.height = Math.max(MIN_HEIGHT, start!.height - deltaY);
        next.y = start!.y + (start!.height - next.height);
      }

      const clamped = clampToViewport(next);
      frameRef.current = clamped;
      applyFrame(panel!, clamped);
    }

    function onUp() {
      panel!.removeAttribute("data-dragging");
      document.documentElement.classList.remove("lmaa-help-dragging");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (frameRef.current) writeFrame(frameRef.current);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <aside aria-label="Shortcodes" className="lmaa-help-panel" ref={panelRef}>
      {/* The header is the drag handle, which is why the cursor changes on it. */}
      <header className="lmaa-help-header" onPointerDown={startDrag}>
        <h2 className="font-semibold text-[var(--ds-text)] text-[0.875rem]">Shortcodes</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hilfe schliessen"
          className="ml-auto inline-flex items-center justify-center size-6 rounded-control text-[var(--ds-text-muted)] hover:bg-[var(--ds-control-hover-bg)]"
        >
          <XIcon weight="bold" aria-hidden="true" className="size-3.5" />
        </button>
      </header>

      {RESIZE_EDGES.map((edge) => (
        <div
          key={edge}
          className="lmaa-help-grip"
          data-edge={edge}
          onPointerDown={(event) => startResize(event, edge)}
        />
      ))}

      <p className="lmaa-help-hint">
        Ein Shortcode steht in doppelten eckigen Klammern und darf über mehrere Zeilen gehen. Ein
        Stern markiert ein Pflichtfeld, eingerückte Einträge gelten nur innerhalb ihres Elternteils.
        Eine Variable steht in geschweiften Klammern und gilt im Fliesstext wie in einem Feld.
      </p>

      <div className="lmaa-help-split">
        <ShortcodeList selected={selected} onSelect={setSelected} />
        <div className="lmaa-help-body">
          {shownDefinition ? (
            <DefinitionEntry definition={shownDefinition} depth={0} />
          ) : (
            <VariableEntry name={(selected as { kind: "variable"; name: SiteVariableName }).name} />
          )}
        </div>
      </div>
    </aside>,
    document.body,
  );
}
