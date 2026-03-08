import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import type { Extension } from "@codemirror/state";
import { EditorView, placeholder as cmPlaceholder } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import CodeMirror from "@uiw/react-codemirror";
import * as React from "react";

export interface MarkdownEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  height?: string;
  extensions?: Extension[];
  className?: string;
}

const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--ds-input-bg)",
    color: "var(--ds-text)",
    fontSize: "var(--source-font-size, 0.875rem)",
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

export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder,
  rows = 6,
  height,
  extensions: extraExtensions = [],
  className = "",
}: MarkdownEditorProps) {
  const minHeight = height ? undefined : `${rows * 1.5}rem`;

  const extensions = React.useMemo(
    () => [
      markdown({ codeLanguages: languages }),
      EditorView.lineWrapping,
      ...(placeholder ? [cmPlaceholder(placeholder)] : []),
      ...extraExtensions,
    ],
    // extraExtensions is spread from props — caller is responsible for stability
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
    [placeholder, extraExtensions],
  );

  return (
    <div
      className={`rounded-control border border-[var(--ds-border)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:outline-none ${className}`}
      style={height ? { height } : undefined}
    >
      <CodeMirror
        value={value}
        onChange={(val) => onChange(val)}
        extensions={extensions}
        theme={lmaaTheme}
        height={height}
        minHeight={minHeight}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          highlightSelectionMatches: false,
          tabSize: 2,
        }}
        onCreateEditor={(view) => {
          if (id) view.contentDOM.id = id;
        }}
      />
    </div>
  );
}
