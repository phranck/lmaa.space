import { CheckCircleIcon, InfoIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

/**
 * What a notice is telling the reader, which decides its colour and its icon.
 *
 * `info` is something to read before acting. `success` is something that has
 * already happened.
 */
export type NoticeTone = "info" | "success";

/**
 * Props for {@link NoticeCard}.
 *
 * @property tone - What kind of notice this is. Defaults to `info`.
 * @property title - A line above the body, for a notice that announces
 *   something. Left out, the body stands alone, which is the usual shape.
 * @property inset - Draws the notice as a surface of its own rather than as a
 *   card nested inside one, which changes its radius and its padding.
 * @property children - The body. Rendered as it is given, so page content goes
 *   in already rendered and sanitised.
 */
interface NoticeCardProps {
  tone?: NoticeTone;
  title?: string;
  inset?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * The tokens each tone draws itself in.
 *
 * Held as data rather than as branches in the markup, so a third tone is a line
 * here and nothing else.
 */
const TONES = {
  info: {
    background: "var(--ds-info-bg)",
    border: "var(--ds-info-border)",
    text: "var(--ds-info-text)",
    icon: InfoIcon,
  },
  success: {
    background: "var(--ds-accent-tint)",
    border: "var(--ds-accent)",
    text: "var(--ds-text)",
    icon: CheckCircleIcon,
  },
} as const satisfies Record<NoticeTone, unknown>;

/**
 * A short notice with an icon, drawn as a tinted card.
 *
 * Used wherever the site says one thing to the reader beside what they are
 * doing: a warning to compare their banking app against the page, or a
 * confirmation that their announcement went through. One shape for both, so
 * they read as the same kind of thing and change together.
 */
export function NoticeCard({
  tone = "info",
  title,
  inset = false,
  className = "",
  children,
}: NoticeCardProps) {
  const { background, border, text, icon: Icon } = TONES[tone];

  return (
    <div
      className={`flex gap-2 text-sm ${className}`}
      style={{
        // A notice standing on its own surface takes the card radius and the
        // card padding; one nested inside a card takes the inner radius, which
        // is the outer one less the padding it sits behind.
        borderRadius: inset ? "var(--radius-card)" : "var(--radius-card-inner)",
        padding: inset ? "var(--card-padding)" : "0.75rem",
        background,
        border: `1px solid ${border}`,
        color: text,
        lineHeight: "var(--ds-leading-sm)",
      }}
    >
      <span
        aria-hidden="true"
        className="flex shrink-0 items-center"
        style={{ height: "calc(1em * var(--ds-leading-sm))" }}
      >
        <Icon weight="duotone" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="m-0 font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}
