import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorSelection, Prec, type Extension } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { BracketsSquareIcon, TextAlignJustifyIcon } from "@phosphor-icons/react";
import CodeMirror from "@uiw/react-codemirror";
import * as React from "react";

import { MarkdownShortcodeReference } from "./MarkdownShortcodeReference.tsx";

export interface MarkdownEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onPaste?: (event: ClipboardEvent) => void;
  placeholder?: string;
  rows?: number;
  height?: string;
  resizable?: boolean;
  showHints?: boolean;
  extensions?: Extension[];
  className?: string;
}

// --- Theme ---

const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--ds-md-editor-bg, var(--ds-form-control-bg, var(--ds-input-bg)))",
    color: "var(--ds-text)",
    fontSize: "var(--source-font-size, 0.875rem)",
  },
  ".cm-editor": {
    height: "100%",
    minHeight: 0,
  },
  ".cm-scroller": {
    overflowY: "auto",
    overflowX: "auto",
    overscrollBehavior: "contain",
  },
  ".cm-content": {
    padding: "0.375rem 0.75rem",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    caretColor: "var(--color-primary)",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--color-primary)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
  },
  ".cm-placeholder": {
    color: "var(--ds-text-subtle)",
    fontStyle: "normal",
  },
});

const highlightStyle = HighlightStyle.define([
  {
    tag: [t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6],
    fontWeight: "600",
    color: "var(--md-heading)",
  },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic", color: "var(--md-emphasis)" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: [t.link, t.url], color: "var(--color-primary)" },
  { tag: t.monospace, fontFamily: "inherit", color: "var(--md-code)" },
  { tag: t.quote, color: "var(--md-quote)", fontStyle: "italic" },
  { tag: t.processingInstruction, color: "var(--md-punctuation)" },
  { tag: t.punctuation, color: "var(--md-punctuation)" },
  { tag: t.atom, color: "var(--md-punctuation)" },
]);

const lmaaTheme = [editorTheme, syntaxHighlighting(highlightStyle)];

const EMPTY_EXTENSIONS: Extension[] = [];

// --- Keymap ---

function wrapSelection(view: EditorView, before: string, after: string): boolean {
  view.dispatch(
    view.state.changeByRange((range) => {
      const text = view.state.sliceDoc(range.from, range.to);
      const insert = `${before}${text}${after}`;
      return {
        changes: { from: range.from, to: range.to, insert },
        range: EditorSelection.range(
          range.from + before.length,
          range.from + before.length + text.length,
        ),
      };
    }),
  );
  return true;
}

const mdKeymap = Prec.highest(
  keymap.of([
    { key: "Mod-b", run: (view) => wrapSelection(view, "**", "**") },
    { key: "Mod-i", run: (view) => wrapSelection(view, "*", "*") },
    { key: "Mod-Shift-d", run: (view) => wrapSelection(view, "~~", "~~") },
    {
      key: "Mod-k",
      run(view) {
        const { state } = view;
        view.dispatch(
          state.changeByRange((range) => {
            const sel = state.sliceDoc(range.from, range.to);
            const insert = `[${sel}]()`;
            return {
              changes: { from: range.from, to: range.to, insert },
              range: EditorSelection.cursor(range.from + insert.length - 1),
            };
          }),
        );
        return true;
      },
    },
  ]),
);

// --- Hints bar ---

function Key({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.25rem] h-[1.25rem] px-[0.25rem] rounded border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elevated)] text-[var(--ds-text-muted)] text-[0.625rem] font-medium shadow-[0_1px_0_var(--ds-border)] leading-none select-none">
      {children}
    </kbd>
  );
}

function Hint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-0.5">
      {keys.map((k) => (
        <Key key={k}>{k}</Key>
      ))}
      <span className="ml-0.5 text-[var(--ds-text-muted)]">{label}</span>
    </span>
  );
}

/**
 * Remembers the line-wrap choice across pages and reloads.
 *
 * Wrapping stays on by default, because prose is the common case. It is turned
 * off for a nested shortcode, where a wrapped line hides the indentation that
 * carries the structure.
 */
const WRAP_STORAGE_KEY = "lmaa.markdown-editor.line-wrap";

function readStoredWrap(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(WRAP_STORAGE_KEY) !== "off";
}

function FooterButton({
  onClick,
  pressed,
  title,
  children,
}: {
  onClick: () => void;
  pressed?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      className={`inline-flex items-center gap-1 h-[1.375rem] px-1.5 rounded border text-[0.625rem] leading-none transition-colors ${
        pressed
          ? "border-[var(--ds-border-strong)] bg-[var(--ds-control-active-bg)] text-[var(--ds-text)] font-medium"
          : "border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-[var(--ds-text-muted)]"
      }`}
    >
      {children}
    </button>
  );
}

function HintsBar({
  lineWrap,
  onToggleLineWrap,
  onOpenReference,
}: {
  lineWrap: boolean;
  onToggleLineWrap: () => void;
  onOpenReference: () => void;
}) {
  return (
    <div className="shrink-0 hidden min-[420px]:flex items-center justify-between gap-3 w-full px-2.5 py-1.5 border-t border-[var(--ds-border)] bg-[var(--ds-section-header-bg,var(--ds-bg-elevated))] text-[0.625rem]">
      <div className="flex items-center gap-2.5">
        <Hint keys={["⌘", "B"]} label="Fett" />
        <Hint keys={["⌘", "I"]} label="Kursiv" />
        <Hint keys={["⌘", "K"]} label="Link" />
        <Hint keys={["⌘", "⇧", "D"]} label="Durch." />
      </div>
      <div className="flex items-center gap-1.5">
        {/* The state is carried by the surface, the border and the weight of the
            label, not by colour alone. */}
        <FooterButton
          onClick={onToggleLineWrap}
          pressed={lineWrap}
          title={lineWrap ? "Zeilenumbruch ausschalten" : "Zeilenumbruch einschalten"}
        >
          <TextAlignJustifyIcon weight="duotone" aria-hidden="true" className="size-3" />
          Umbruch {lineWrap ? "an" : "aus"}
        </FooterButton>
        <FooterButton onClick={onOpenReference} title="Shortcodes nachschlagen">
          <BracketsSquareIcon weight="duotone" aria-hidden="true" className="size-3" />
          Shortcodes
        </FooterButton>
      </div>
    </div>
  );
}

// --- Component ---

export function MarkdownEditorCore({
  id,
  value,
  onChange,
  onPaste,
  placeholder,
  rows = 4,
  height,
  resizable = false,
  showHints = true,
  extensions: extraExtensions = EMPTY_EXTENSIONS,
  className = "",
}: MarkdownEditorProps) {
  const [lineWrap, setLineWrap] = React.useState(readStoredWrap);
  const [referenceOpen, setReferenceOpen] = React.useState(false);

  function toggleLineWrap() {
    setLineWrap((current) => {
      const next = !current;
      window.localStorage.setItem(WRAP_STORAGE_KEY, next ? "on" : "off");
      return next;
    });
  }

  const rowsHeight = `${rows * 1.5}rem`;
  // When resizable + hints bar visible, the wrapper height must cover both the
  // editor content area (rowsHeight) AND the hints bar (~2.25rem).
  const wrapperHeight = resizable && showHints ? `calc(${rowsHeight} + 2.25rem)` : rowsHeight;

  const extensions = React.useMemo(
    () => [
      markdown(),
      ...(lineWrap ? [EditorView.lineWrapping] : []),
      mdKeymap,
      ...(onPaste
        ? [
            EditorView.domEventHandlers({
              paste(event) {
                onPaste(event);
                return event.defaultPrevented;
              },
            }),
          ]
        : []),
      ...(placeholder ? [cmPlaceholder(placeholder)] : []),
      ...extraExtensions,
    ],
    // extraExtensions is spread from props — caller is responsible for stability
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
    [onPaste, placeholder, extraExtensions, lineWrap],
  );

  const wrapperStyle: React.CSSProperties | undefined = resizable
    ? { height: wrapperHeight, resize: "vertical", overflow: "hidden" }
    : height
      ? { height }
      : undefined;

  // The footer is a row of the wrapper, so the wrapper has to be a column
  // whenever it has a bounded height. Without this the editor fills the whole
  // height, the footer sits below the clipped box and is never seen, and the
  // scroller inherits no definite height of its own to scroll within.
  const hasBoundedHeight = resizable || Boolean(height);
  const isFlexCol = showHints && hasBoundedHeight;
  const editorContainerClassName = hasBoundedHeight ? "h-full min-h-0" : undefined;

  return (
    <div
      id={id}
      className={`rounded-control border border-[var(--ds-border)] bg-[var(--ds-form-control-bg,var(--ds-input-bg))] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:outline-none ${isFlexCol ? "flex flex-col" : ""} ${className}`}
      style={wrapperStyle}
    >
      <div className={isFlexCol ? "flex-1 min-h-0 overflow-hidden" : undefined}>
        <CodeMirror
          value={value}
          onChange={(val) => onChange(val)}
          extensions={extensions}
          theme={lmaaTheme}
          className={editorContainerClassName}
          height={isFlexCol || resizable ? "100%" : height}
          minHeight={resizable ? undefined : height ? undefined : rowsHeight}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: false,
            highlightSelectionMatches: false,
            tabSize: 2,
          }}
        />
      </div>
      {showHints && (
        <HintsBar
          lineWrap={lineWrap}
          onToggleLineWrap={toggleLineWrap}
          onOpenReference={() => setReferenceOpen(true)}
        />
      )}
      <MarkdownShortcodeReference open={referenceOpen} onClose={() => setReferenceOpen(false)} />
    </div>
  );
}
