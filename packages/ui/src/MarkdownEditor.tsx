import * as React from "react";

/**
 * The props, taken from the editor itself rather than restated here.
 *
 * The two had drifted: this file listed them again, so a prop added to the
 * editor was accepted by the editor and rejected by the wrapper in front of
 * it. A type-only import costs nothing at runtime and cannot fall behind.
 */
export type { MarkdownEditorProps } from "./MarkdownEditorCore.tsx";

import type { MarkdownEditorProps } from "./MarkdownEditorCore.tsx";

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
