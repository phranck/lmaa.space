import { json } from "@codemirror/lang-json";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView, placeholder as cmPlaceholder } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import CodeMirror from "@uiw/react-codemirror";
import * as React from "react";

export interface JsonEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  minHeight?: string;
  resizable?: boolean;
  readOnly?: boolean;
  extensions?: Extension[];
  className?: string;
}

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
  ".cm-gutters": {
    backgroundColor: "var(--ds-bg-elevated)",
    color: "var(--ds-text-subtle)",
    borderRight: "1px solid var(--ds-border)",
    minHeight: "100%",
  },
  ".cm-gutter": {
    minHeight: "100%",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "2.5rem",
    padding: "0 0.625rem 0 0.75rem",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "var(--ds-text-muted)",
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
  { tag: t.brace, color: "var(--md-punctuation)" },
  { tag: t.squareBracket, color: "var(--md-punctuation)" },
  { tag: t.separator, color: "var(--md-punctuation)" },
  { tag: t.string, color: "var(--color-primary)" },
  { tag: t.number, color: "var(--md-code)" },
  { tag: t.bool, color: "var(--md-emphasis)" },
  { tag: t.null, color: "var(--ds-text-muted)", fontStyle: "italic" },
  { tag: t.propertyName, color: "var(--ds-text)" },
]);

const jsonTheme = [editorTheme, syntaxHighlighting(highlightStyle)];

export function JsonEditor({
  id,
  value,
  onChange,
  placeholder,
  height,
  minHeight = "9rem",
  resizable = false,
  readOnly = false,
  extensions: extraExtensions = [],
  className = "",
}: JsonEditorProps) {
  const extensions = React.useMemo(
    () => [
      json(),
      EditorView.lineWrapping,
      ...(placeholder ? [cmPlaceholder(placeholder)] : []),
      EditorView.editable.of(!readOnly),
      ...extraExtensions,
    ],
    [placeholder, readOnly, extraExtensions],
  );

  const wrapperStyle: React.CSSProperties | undefined = resizable
    ? { height: minHeight, resize: "vertical", overflow: "hidden" }
    : height
      ? { height, overflow: "hidden" }
      : undefined;

  const hasBoundedHeight = resizable || Boolean(height);
  const editorContainerClassName = hasBoundedHeight ? "h-full min-h-0" : undefined;

  return (
    <div
      id={id}
      className={`rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:outline-none ${className}`}
      style={wrapperStyle}
    >
      <CodeMirror
        value={value}
        onChange={(nextValue) => onChange(nextValue)}
        extensions={extensions}
        theme={jsonTheme}
        className={editorContainerClassName}
        height={hasBoundedHeight ? "100%" : undefined}
        minHeight={resizable ? undefined : (height ? undefined : minHeight)}
        editable={!readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: false,
          highlightSelectionMatches: false,
          tabSize: 2,
        }}
      />
    </div>
  );
}
