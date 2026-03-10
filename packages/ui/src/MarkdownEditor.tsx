import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorSelection, Prec, type Extension } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import CodeMirror from "@uiw/react-codemirror";
import * as React from "react";
import { SiMarkdown } from "react-icons/si";

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
    backgroundColor: "var(--ds-input-bg)",
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
  { tag: [t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6], fontWeight: "600", color: "var(--md-heading)" },
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

const mdKeymap = Prec.highest(keymap.of([
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
]));

// --- Hints bar ---

function Key({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.125rem] h-[1.125rem] px-[0.2rem] rounded border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elevated)] text-[var(--ds-text-muted)] text-[0.5625rem] font-medium shadow-[0_1px_0_var(--ds-border)] leading-none select-none">
      {children}
    </kbd>
  );
}

function Hint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-0.5">
      {keys.map((k) => <Key key={k}>{k}</Key>)}
      <span className="ml-0.5 text-[var(--ds-text-subtle)]">{label}</span>
    </span>
  );
}

function HintsBar() {
  return (
    <div className="flex items-center justify-between gap-3 px-2.5 py-1.5 border-t border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-[0.625rem]">
      <SiMarkdown className="w-5 h-5 text-[var(--ds-text-subtle)] opacity-50 shrink-0" />
      <div className="flex items-center gap-2.5">
        <Hint keys={["⌘", "B"]} label="Fett" />
        <Hint keys={["⌘", "I"]} label="Kursiv" />
        <Hint keys={["⌘", "K"]} label="Link" />
        <Hint keys={["⌘", "⇧", "D"]} label="Durch." />
      </div>
      <div className="hidden xl:flex items-center gap-2 text-[var(--ds-text-subtle)]">
        <span className="font-mono">[[widget:key]]</span>
        <span className="font-mono">[[image:/uploads/...]]</span>
        <span className="font-mono">[[pdf:/uploads/...]]</span>
      </div>
    </div>
  );
}

// --- Component ---

export function MarkdownEditor({
  id,
  value,
  onChange,
  onPaste,
  placeholder,
  rows = 4,
  height,
  resizable = false,
  showHints = true,
  extensions: extraExtensions = [],
  className = "",
}: MarkdownEditorProps) {
  const rowsHeight = `${rows * 1.5}rem`;
  // When resizable + hints bar visible, the wrapper height must cover both the
  // editor content area (rowsHeight) AND the hints bar (~2.25rem).
  const wrapperHeight =
    resizable && showHints ? `calc(${rowsHeight} + 2.25rem)` : rowsHeight;

  const extensions = React.useMemo(
    () => [
      markdown(),
      EditorView.lineWrapping,
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
    [onPaste, placeholder, extraExtensions],
  );

  const wrapperStyle: React.CSSProperties | undefined = resizable
    ? { height: wrapperHeight, resize: "vertical", overflow: "hidden" }
    : height
      ? { height }
      : undefined;

  const isFlexCol = resizable && showHints;
  const hasBoundedHeight = resizable || Boolean(height);
  const editorContainerClassName = hasBoundedHeight ? "h-full min-h-0" : undefined;

  return (
    <div
      id={id}
      className={`rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:outline-none ${isFlexCol ? "flex flex-col" : ""} ${className}`}
      style={wrapperStyle}
    >
      <div className={isFlexCol ? "flex-1 min-h-0 overflow-hidden" : undefined}>
        <CodeMirror
          value={value}
          onChange={(val) => onChange(val)}
          extensions={extensions}
          theme={lmaaTheme}
          className={editorContainerClassName}
          height={resizable ? "100%" : height}
          minHeight={resizable ? undefined : (height ? undefined : rowsHeight)}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: false,
            highlightSelectionMatches: false,
            tabSize: 2,
          }}
        />
      </div>
      {showHints && <HintsBar />}
    </div>
  );
}
