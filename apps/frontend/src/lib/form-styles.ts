/**
 * How a form field looks on this site.
 *
 * Stated once and read by every form the website renders, so a field in the
 * shop submission and a field in the sponsorship form are the same field. Each
 * value is written in the site's own tokens rather than in colours of its own.
 */

/** One line of input: a text field, a select, or a textarea with its own height. */
export const inputClass =
  "w-full px-3 h-9 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent)]";

/** What a field says when what was typed does not hold up. */
export const errorClass = "text-[var(--ds-danger-text)] text-xs mt-1";

/** The name of a field, above it. */
export const labelClass = "block text-sm font-medium text-[var(--ds-text)] mb-1.5 px-1";

/** What every button in a form is, before it says whether it is the filled one. */
export const buttonBaseClass =
  "flex items-center gap-1.5 h-9 px-3 rounded-control font-medium text-sm transition-colors";

/** The one button that submits, which is the only filled one in a form. */
export const buttonFilledClass =
  "bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] hover:bg-[var(--ds-btn-filled-hover)] disabled:opacity-60";
