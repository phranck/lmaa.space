import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

/**
 * Props for {@link CopyableCode}.
 *
 * @property value - What is shown and what is copied, such as `{payeeName}`.
 *   The two are the same thing, so nothing can be shown that is not what lands
 *   in the clipboard.
 * @property copyLabel - What the control announces to a screen reader, since a
 *   variable name is not a sentence and an icon is not a word.
 */
interface CopyableCodeProps {
  value: string;
  copyLabel: string;
}

/** How long the tick stands before the icon goes back to offering the copy. */
const CONFIRMATION_MS = 1600;

/**
 * A short value shown as code, with a button that puts it in the clipboard.
 *
 * Used wherever the dashboard names something an editor is meant to type
 * somewhere else: a variable, a token, a key. Typing one out by hand is how a
 * name gets a letter wrong, and the mistake then shows up as a literal
 * `{payeName}` on the page rather than as an error anywhere.
 */
export function CopyableCode({ value, copyLabel }: CopyableCodeProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // A browser that refuses the clipboard leaves the value on screen to be
      // selected by hand, which is what it was before this button existed.
      return;
    }

    setCopied(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), CONFIRMATION_MS);
  }

  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <code className="rounded px-1.5 py-0.5 font-mono text-[11px] bg-[var(--ds-surface-inset)] text-[var(--ds-text)]">
        {value}
      </code>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copyLabel}
        title={copyLabel}
        className="inline-flex items-center rounded p-0.5 text-[var(--ds-text-subtle)] hover:text-[var(--ds-text)] cursor-copy"
      >
        {/* The tick arrives at once and the icon fades back afterwards, so the
            transition sits on the resting state rather than on the confirmed
            one. */}
        {copied ? (
          <CheckIcon weight="bold" className="size-3.5 text-[var(--ds-success-text)]" />
        ) : (
          <CopyIcon weight="duotone" className="size-3.5 transition-colors" />
        )}
      </button>
    </span>
  );
}
