import type * as React from "react";
import { SiMarkdown } from "react-icons/si";

/**
 * Props for the shared Markdown textarea component.
 */
export interface MarkdownTextareaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onPaste?: React.ClipboardEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  rows?: number;
  className?: string;
}

/**
 * Textarea with a Markdown icon badge indicating Markdown support.
 */
export function MarkdownTextarea({
  id,
  value,
  onChange,
  onPaste,
  placeholder,
  rows = 6,
  className = "",
}: MarkdownTextareaProps) {
  return (
    <div className="relative">
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        rows={rows}
        placeholder={placeholder}
        className={`w-full px-3 py-1.5 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-y ${className}`}
      />
      <SiMarkdown className="absolute bottom-2 right-2 w-5 h-5 text-[var(--ds-text-subtle)] opacity-40 pointer-events-none" />
    </div>
  );
}
