import type { Extension } from "@codemirror/state";
import * as React from "react";

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

const MarkdownEditorCore = React.lazy(() =>
  import("./MarkdownEditorCore.tsx").then((module) => ({ default: module.MarkdownEditorCore })),
);

function MarkdownEditorFallback({
  id,
  rows = 4,
  height,
  resizable = false,
  showHints = true,
  className = "",
}: MarkdownEditorProps) {
  const rowsHeight = `${rows * 1.5}rem`;
  const wrapperHeight = resizable && showHints ? `calc(${rowsHeight} + 2.25rem)` : rowsHeight;
  const style: React.CSSProperties | undefined = resizable
    ? { height: wrapperHeight, resize: "vertical", overflow: "hidden" }
    : height
      ? { height }
      : undefined;

  return (
    <div
      id={id}
      className={`rounded-control border border-[var(--ds-border)] bg-[var(--ds-form-control-bg,var(--ds-input-bg))] overflow-hidden ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function MarkdownEditor(props: MarkdownEditorProps) {
  return (
    <React.Suspense fallback={<MarkdownEditorFallback {...props} />}>
      <MarkdownEditorCore {...props} />
    </React.Suspense>
  );
}
