import { CheckCircleIcon } from "@phosphor-icons/react";
import type * as React from "react";
import { useState } from "react";

import { EURO_SYMBOL, formatEuroWhole } from "@lmaa/shared";

import type { SupportLadderInterval } from "@/lib/content-shortcode-segments";
import { buttonBaseClass } from "@/lib/form-styles";

/**
 * Renders one of the ladder's prose fields.
 *
 * The text arrives as HTML, already rendered and sanitised by the page's own
 * Markdown pipeline before it ever reaches the browser, so the wording inside a
 * shortcode behaves exactly like the wording around it. Nothing here comes from
 * a visitor; it is the same page content the rest of the article is built from.
 *
 * Paragraph margins are reset, because these fields sit inside a card rather
 * than in an article, and only the space between paragraphs is kept.
 */
export function RichText({
  html,
  className,
  style,
  role,
}: {
  html: string;
  className?: string;
  style?: React.CSSProperties;
  role?: string;
}) {
  return (
    <div
      role={role}
      className={`lmaa-rich ${className ?? ""}`}
      style={style}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: page content, rendered and sanitised server-side by renderMarkdownSSR
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * The suggested amounts of one interval, plus its free-amount field.
 *
 * Separated from the ladder because it is the only part that changes when the
 * visitor picks an amount, and because the ladder is otherwise long enough to
 * hide it.
 */
export function AmountGrid({
  interval,
  amountEur,
  customAmount,
  perMonthLabel,
  onChoose,
  onCustom,
  className = "",
  minimumEur = 0,
  minimumNotice = "",
  bare = false,
}: {
  interval: SupportLadderInterval;
  amountEur: number;
  customAmount: string;
  perMonthLabel: string;
  onChoose: (amountEur: number) => void;
  onCustom: (value: string) => void;
  className?: string;
  /** The least this tab accepts to earn what it offers, in euro. */
  minimumEur?: number;
  /** What to say when the amount falls short of it. */
  minimumNotice?: string;
  /**
   * Drops the free field's own card, leaving the heading and the field alone.
   *
   * A tab that stands everything it asks for on one card has no use for a
   * second one around a single field, and two tinted surfaces inside each
   * other read as a mistake rather than as structure.
   */
  bare?: boolean;
}) {
  // A value in the free field is the choice, so no suggested amount is active
  // whilst it holds one.
  const customActive = customAmount.trim() !== "";
  const hasOptions = interval.options.length > 0;
  /**
   * Whether the field has been left since it was last changed.
   *
   * The notice waits for that, because somebody typing their way to 40 passes
   * through 4 on the way, and being told off at every keystroke is no help.
   */
  const [leftTheField, setLeftTheField] = useState(false);
  // Only once something has been typed, so an empty field is not an error.
  const belowMinimum =
    leftTheField && minimumEur > 0 && customActive && amountEur > 0 && amountEur < minimumEur;

  return (
    // The suggested amounts stand in one row wherever the page is wide enough,
    // because they are read against each other rather than one after the other.
    // A tab without them has one card to place and needs no columns at all.
    <div className={`grid gap-3 ${hasOptions ? "sm:grid-cols-2 lg:grid-cols-4" : ""} ${className}`}>
      {interval.options.map((option, index) => {
        const active = !customActive && option.amountEur === amountEur;
        return (
          <button
            // The position is part of the key, because an editor may write the
            // same amount twice and the amount alone would then collide.
            key={`${interval.key}-${index}-${option.amountEur}`}
            type="button"
            aria-pressed={active}
            onClick={() => onChoose(option.amountEur)}
            className="lmaa-card lmaa-amount-card relative flex flex-col gap-1.5 text-left hover:-translate-y-0.5"
            style={{
              border: "var(--card-border-width) solid",
              padding: "var(--card-padding)",
              borderRadius: "var(--radius-card)",
              background: active ? "var(--ds-accent-tint)" : "var(--ds-surface)",
              borderColor: active ? "var(--ds-accent)" : "var(--ds-border-subtle)",
            }}
          >
            <span
              className="text-xl leading-none font-bold tabular-nums"
              style={{ fontFamily: "var(--ds-font-serif)" }}
            >
              {formatEuroWhole(option.amountEur)}
              {interval.key === "monthly" && (
                <span
                  className="ml-1 text-sm font-medium"
                  style={{ color: "var(--ds-text-muted)" }}
                >
                  {perMonthLabel}
                </span>
              )}
            </span>
            {option.description && (
              <RichText
                html={option.description}
                className="text-sm"
                style={{ color: "var(--ds-text-muted)" }}
              />
            )}
            {/* A tick, so the chosen rung is not marked by colour alone. */}
            {active && (
              <CheckCircleIcon
                weight="fill"
                aria-hidden="true"
                className="absolute size-5"
                style={{
                  top: "var(--card-padding)",
                  right: "var(--card-padding)",
                  color: "var(--ds-accent)",
                }}
              />
            )}
          </button>
        );
      })}

      {interval.custom && (
        <label
          // The free amount is the alternative to all the suggestions rather
          // than one more of them, so it stands on a row of its own, two cards
          // wide and centred under them. Spanning columns also keeps it out of
          // the track sizing, which its input would otherwise decide instead of
          // the amounts. Where there are no suggestions it is the only card and
          // simply fills what it is given.
          className={`flex flex-col gap-1.5 ${bare ? "" : "lmaa-card"} ${
            hasOptions ? "col-span-full sm:col-span-2 lg:col-span-2 lg:col-start-2" : ""
          }`}
          style={
            bare
              ? undefined
              : {
                  border: "var(--card-border-width) dashed",
                  padding: "var(--card-padding)",
                  borderRadius: "var(--radius-card)",
                  // It stands half a step off the page rather than on the same
                  // white as the amounts, because it is a field to fill in
                  // rather than one more thing to pick. The line is the one the
                  // amounts carry, so the dash alone tells it apart.
                  borderColor: customActive ? "var(--ds-accent)" : "var(--ds-border-subtle)",
                  background: customActive ? "var(--ds-accent-tint)" : "var(--ds-surface-soft)",
                }
          }
        >
          {/* A heading, like the one every other block of this ladder carries,
              because it names what the card is rather than labelling the field
              inside it. The field states its own name to a screen reader. */}
          <h3
            className={`font-semibold ${bare ? "text-center" : ""}`}
            style={{
              fontFamily: "var(--ds-font-serif)",
              fontSize: "var(--ds-text-lg)",
              lineHeight: "var(--ds-leading-lg)",
            }}
          >
            {interval.custom.label}
          </h3>
          <span className={`flex items-center gap-2 ${bare ? "justify-center" : ""}`}>
            <span
              aria-hidden="true"
              // The currency stands before the figure, here and everywhere else
              // on this page, because the site is run from Austria and that is
              // how an amount is written there.
              className="leading-none font-bold"
              style={{
                fontFamily: "var(--ds-font-serif)",
                // Bigger where the amount is the first thing to settle rather
                // than one section among several.
                fontSize: bare ? "var(--ds-text-2xl)" : "var(--ds-text-xl)",
              }}
            >
              {EURO_SYMBOL}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={customAmount}
              // Where the tab names a floor, the empty field shows that floor
              // rather than a number written into the page. Emptying the field
              // hands the choice back to the floor, so anything else here would
              // suggest one amount whilst the code beneath carried another.
              placeholder={minimumEur > 0 ? String(minimumEur) : interval.custom.placeholder}
              aria-label={`${interval.custom.label} in Euro`}
              onChange={(event) => {
                setLeftTheField(false);
                onCustom(event.target.value);
              }}
              onBlur={() => setLeftTheField(true)}
              // Wide enough for a five-figure amount and no wider, because the
              // field should look like what belongs in it.
              className={`tabular-nums ${
                bare
                  ? // A line to write on rather than a box to fill: no surface of
                    // its own, no corners, and the figure sitting on the rule.
                    "h-12 w-32 pr-2 border-0 border-b rounded-none bg-transparent text-right font-mono"
                  : "h-9 w-24 px-3 border rounded-control"
              }`}
              style={{
                background: bare ? undefined : "var(--ds-surface)",
                borderColor: "var(--ds-border)",
                color: "var(--ds-text)",
                // The amount is what the whole card is about, so it is set at
                // the size the figure deserves rather than at field size.
                fontSize: bare ? "var(--ds-text-2xl)" : undefined,
                fontWeight: bare ? 700 : undefined,
              }}
            />
            {interval.key === "monthly" && (
              <span className="text-sm font-medium" style={{ color: "var(--ds-text-muted)" }}>
                {perMonthLabel}
              </span>
            )}
          </span>
          {interval.custom.text && (
            <RichText
              html={interval.custom.text}
              className={`text-sm ${bare ? "text-center" : ""}`}
              style={{ color: "var(--ds-text-muted)" }}
            />
          )}
          {/* Said rather than refused. Nothing is submitted here: the transfer
              happens in the reader's own bank, so the field cannot stop an
              amount, only say what it will and will not earn. */}
          {belowMinimum && minimumNotice && (
            <RichText
              html={minimumNotice}
              className={`text-sm ${bare ? "text-center" : ""}`}
              role="status"
              style={{ color: "var(--ds-warning-text)" }}
            />
          )}
        </label>
      )}
    </div>
  );
}
