import { markdown } from "@codemirror/lang-markdown";
import {
  getIndentUnit,
  HighlightStyle,
  indentService,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorSelection, EditorState, Prec, type Extension } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  highlightWhitespace,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import {
  BracketsSquareIcon,
  DotOutlineIcon,
  ListNumbersIcon,
  TextAlignJustifyIcon,
} from "@phosphor-icons/react";
import CodeMirror from "@uiw/react-codemirror";
import * as React from "react";

import {
  shortcodeIndentFor,
  shortcodePasteRewrite,
  type ShortcodePasteRewrite,
} from "@lmaa/shared";

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
  // A column beside the text rather than a mark in front of each line, so it
  // runs the full height and stays put whilst a long line scrolls past it.
  ".cm-gutters": {
    backgroundColor: "var(--ds-bg-elevated)",
    color: "var(--ds-text-subtle)",
    border: "none",
    borderRight: "1px solid var(--ds-border)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 0.5rem 0 0.75rem",
    minWidth: "2.5rem",
  },
  // The numbers sit on the same rhythm as the lines they count. Left to
  // inherit, the two drift apart by a whole line over enough of them.
  ".cm-gutters, .cm-content": {
    lineHeight: "1.5",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
  },
  // A visible space is drawn as a dot in a background image rather than as
  // text, so the colour is set there. CodeMirror's own is a fixed grey, which
  // reads as a smudge on the dark surface and as nothing on the light one.
  ".cm-highlightSpace": {
    backgroundImage:
      "radial-gradient(circle at 50% 55%, var(--ds-text-subtle) 20%, transparent 5%)",
  },
  // The end-of-line mark is quieter still than a space, because there is one on
  // every line and they would otherwise read as a column of their own.
  ".cm-lineEndMark": {
    color: "var(--ds-text-subtle)",
    opacity: "0.5",
    userSelect: "none",
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

// --- Whitespace ---

/**
 * The mark drawn where a line ends.
 *
 * CodeMirror shows spaces and tabs but not the newline itself, and the newline
 * is what a Markdown author most needs to see: two spaces before one are a hard
 * break, and without an end-of-line mark there is no way to tell a line that
 * carries them from one that does not.
 *
 * The character is the one editors have long used for this, and it is hidden
 * from screen readers, which read the line structure from the document.
 */
class LineEndWidget extends WidgetType {
  toDOM(): HTMLElement {
    const mark = document.createElement("span");
    mark.className = "cm-lineEndMark";
    mark.textContent = "¬";
    mark.setAttribute("aria-hidden", "true");
    return mark;
  }

  /** Two of these are interchangeable, so the editor may reuse one for another. */
  eq(): boolean {
    return true;
  }
}

const lineEndWidget = Decoration.widget({ widget: new LineEndWidget(), side: 1 });

/** Places an end-of-line mark after every line but the last. */
function buildLineEndMarks(view: EditorView): DecorationSet {
  const marks = [];
  for (const { from, to } of view.visibleRanges) {
    let line = view.state.doc.lineAt(from);
    while (line.from <= to) {
      if (line.number < view.state.doc.lines) marks.push(lineEndWidget.range(line.to));
      if (line.to + 1 > view.state.doc.length) break;
      line = view.state.doc.lineAt(line.to + 1);
    }
  }
  return Decoration.set(marks);
}

/**
 * Shows where each line ends.
 *
 * Only the visible lines carry a mark, rebuilt as the document or the viewport
 * changes, so a long document costs no more than a short one.
 */
const highlightLineEnds = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildLineEndMarks(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildLineEndMarks(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

// --- Indentation ---

/**
 * Offers the indentation a line sits at inside the containers above it.
 *
 * Both Return and typing consult this, so a container opens a level, a closing
 * line pulls itself back out, and neither has to be counted by hand.
 *
 * Outside a container it answers `null`, which hands the question back to
 * Markdown's own rules. That is what keeps lists and quotes indenting the way
 * they always have.
 */
const shortcodeIndent = indentService.of((context, position) => {
  const indent = shortcodeIndentFor(
    context.state.doc.toString(),
    position,
    " ".repeat(getIndentUnit(context.state)),
  );
  return indent === null ? null : indent.length;
});

/**
 * Re-indents the line as the closing sequence of a container is typed.
 *
 * Without this the line would keep the indentation of the content above it,
 * and the author would have to remove it themselves the moment they finish
 * writing `}]]`.
 */
const shortcodeIndentOnInput = markdown().language.data.of({ indentOnInput: /^\s*\}\]\]$/ });

/**
 * Re-indents a pasted block for the level it lands on.
 *
 * `indentOnInput` covers typing and completion and deliberately not pasting,
 * so a block pasted into a container would otherwise arrive with its first line
 * indented and every following line flat against the margin.
 *
 * The block is rewritten before it is inserted rather than corrected
 * afterwards, so the document never holds the flat version and one undo takes
 * the whole paste back.
 */
/**
 * Empties a line the caret has just left behind with nothing but indentation.
 *
 * Automatic indentation puts spaces on a line before anything is written on it.
 * Pressing Return again leaves them there, so a document collects lines that
 * look empty and are not. They travel into the content, they show up in a diff,
 * and Markdown counts four of them as the start of a code block.
 *
 * Only the line the caret left is touched, and only whilst it holds nothing but
 * whitespace, so this never reaches a line somebody is still writing on.
 */
const clearIndentOnlyLines = EditorState.transactionFilter.of((transaction) => {
  if (!transaction.docChanged) return transaction;

  const wasAt = transaction.startState.selection.main.head;
  const previous = transaction.startState.doc.lineAt(wasAt);
  if (previous.text === "" || previous.text.trim() !== "") return transaction;

  const now = transaction.state.selection.main.head;
  const line = transaction.state.doc.lineAt(now);
  // Still on the same line means the caret has not left it yet.
  if (line.from === previous.from) return transaction;

  // The line may have moved, so it is found again in the new document rather
  // than trusted to still start where it did.
  const moved = transaction.changes.mapPos(previous.from, -1);
  const after = transaction.state.doc.lineAt(moved);
  if (after.text === "" || after.text.trim() !== "") return transaction;

  return [transaction, { changes: { from: after.from, to: after.to, insert: "" } }];
});

const shortcodeIndentOnPaste = EditorState.transactionFilter.of((transaction) => {
  if (!transaction.docChanged || !transaction.isUserEvent("input.paste")) return transaction;

  const unit = " ".repeat(getIndentUnit(transaction.startState));
  const before = transaction.startState.doc.toString();
  const rewrites: ShortcodePasteRewrite[] = [];

  transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    // One paste at a time. Pasting into a multiple selection is rare and would
    // need a base level per range, which is more machinery than it earns.
    if (rewrites.length > 0) return;

    const rewrite = shortcodePasteRewrite(before, fromA, toA, inserted.toString(), unit);
    if (rewrite) rewrites.push(rewrite);
  });

  const rewrite = rewrites[0];
  if (!rewrite) return transaction;

  return {
    changes: { from: rewrite.from, to: rewrite.to, insert: rewrite.insert },
    selection: { anchor: rewrite.from + rewrite.insert.length },
    userEvent: "input.paste",
  };
});

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
 * Remembers a footer switch across pages and reloads.
 *
 * Each switch names the state it starts in, because they do not agree: wrapping
 * and line numbers are how the editor is normally read, whilst showing every
 * space is something to turn on whilst hunting for one.
 */
const WRAP_STORAGE_KEY = "lmaa.markdown-editor.line-wrap";
const LINE_NUMBERS_STORAGE_KEY = "lmaa.markdown-editor.line-numbers";
const WHITESPACE_STORAGE_KEY = "lmaa.markdown-editor.whitespace";

function readStoredSwitch(key: string, whenUnset: boolean): boolean {
  if (typeof window === "undefined") return whenUnset;
  const stored = window.localStorage.getItem(key);
  if (stored === null) return whenUnset;
  return stored !== "off";
}

function storeSwitch(key: string, on: boolean): void {
  window.localStorage.setItem(key, on ? "on" : "off");
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
  lineNumbers: showLineNumbers,
  onToggleLineNumbers,
  whitespace,
  onToggleWhitespace,
  onOpenReference,
}: {
  lineWrap: boolean;
  onToggleLineWrap: () => void;
  lineNumbers: boolean;
  onToggleLineNumbers: () => void;
  whitespace: boolean;
  onToggleWhitespace: () => void;
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
          onClick={onToggleLineNumbers}
          pressed={showLineNumbers}
          title={showLineNumbers ? "Zeilennummern ausblenden" : "Zeilennummern einblenden"}
        >
          <ListNumbersIcon weight="duotone" aria-hidden="true" className="size-3" />
          Nummern {showLineNumbers ? "an" : "aus"}
        </FooterButton>
        <FooterButton
          onClick={onToggleLineWrap}
          pressed={lineWrap}
          title={lineWrap ? "Zeilenumbruch ausschalten" : "Zeilenumbruch einschalten"}
        >
          <TextAlignJustifyIcon weight="duotone" aria-hidden="true" className="size-3" />
          Umbruch {lineWrap ? "an" : "aus"}
        </FooterButton>
        <FooterButton
          onClick={onToggleWhitespace}
          pressed={whitespace}
          title={whitespace ? "Leerzeichen verbergen" : "Leerzeichen sichtbar machen"}
        >
          <DotOutlineIcon weight="duotone" aria-hidden="true" className="size-3" />
          Leerraum {whitespace ? "an" : "aus"}
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
  const [lineWrap, setLineWrap] = React.useState(() => readStoredSwitch(WRAP_STORAGE_KEY, true));
  const [showLineNumbers, setShowLineNumbers] = React.useState(() =>
    readStoredSwitch(LINE_NUMBERS_STORAGE_KEY, true),
  );
  const [showWhitespace, setShowWhitespace] = React.useState(() =>
    readStoredSwitch(WHITESPACE_STORAGE_KEY, false),
  );
  const [referenceOpen, setReferenceOpen] = React.useState(false);

  function toggleLineWrap() {
    setLineWrap((current) => {
      storeSwitch(WRAP_STORAGE_KEY, !current);
      return !current;
    });
  }

  function toggleLineNumbers() {
    setShowLineNumbers((current) => {
      storeSwitch(LINE_NUMBERS_STORAGE_KEY, !current);
      return !current;
    });
  }

  function toggleWhitespace() {
    setShowWhitespace((current) => {
      storeSwitch(WHITESPACE_STORAGE_KEY, !current);
      return !current;
    });
  }

  const rowsHeight = `${rows * 1.5}rem`;
  // When resizable + hints bar visible, the wrapper height must cover both the
  // editor content area (rowsHeight) AND the hints bar (~2.25rem).
  const wrapperHeight = resizable && showHints ? `calc(${rowsHeight} + 2.25rem)` : rowsHeight;

  const extensions = React.useMemo(
    () => [
      ...(showLineNumbers ? [lineNumbers()] : []),
      ...(showWhitespace ? [highlightWhitespace(), highlightLineEnds] : []),
      markdown(),
      shortcodeIndent,
      shortcodeIndentOnInput,
      shortcodeIndentOnPaste,
      clearIndentOnlyLines,
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
    [onPaste, placeholder, extraExtensions, lineWrap, showLineNumbers, showWhitespace],
  );

  const startHeight = resizable ? (height ?? wrapperHeight) : height;
  const wrapperStyle: React.CSSProperties | undefined = resizable
    ? { height: startHeight, resize: "vertical", overflow: "hidden" }
    : startHeight
      ? { height: startHeight }
      : undefined;

  const hasBoundedHeight = resizable || Boolean(height);

  // The footer is a row of the wrapper, so the wrapper has to be a column
  // whenever it has a bounded height. Without this the editor fills the whole
  // height, the footer sits below the clipped box and is never seen, and the
  // scroller inherits no definite height of its own to scroll within.
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
          lineNumbers={showLineNumbers}
          onToggleLineNumbers={toggleLineNumbers}
          whitespace={showWhitespace}
          onToggleWhitespace={toggleWhitespace}
          onOpenReference={() => setReferenceOpen(true)}
        />
      )}
      <MarkdownShortcodeReference open={referenceOpen} onClose={() => setReferenceOpen(false)} />
    </div>
  );
}
