import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import type * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildEpcQrPayload,
  SUPPORT_LADDER_LABEL_DEFAULTS,
  type SupportLadderLabelKey,
} from "@lmaa/shared";
import { PAYMENT_METHOD_MAP } from "@lmaa/ui";


import githubLockupUrl from "@/assets/brands/github-lockup.svg?url";
import paypalLockupUrl from "@/assets/brands/paypal-lockup.svg?url";
import sepaLockupUrl from "@/assets/brands/sepa-lockup.svg?url";
import { normalizeAmountInput, readAmountInput } from "@/lib/amount-input";
import type {
  SupportLadderBankAccount,
  SupportLadderInterval,
  SupportLadderRoute,
} from "@/lib/content-shortcode-segments";

/**
 * Props for {@link SupportLadder}.
 *
 * Everything here comes from the `[[support-ladder]]` shortcode, so the amounts,
 * the payee and every word are content rather than code.
 *
 * @property bankAccount - Payee and how the block presents itself per interval.
 *   Absent when the page names no account, in which case no transfer block is
 *   shown at all.
 * @property intervals - The frequency tabs, in the order the page names them.
 *   The first one is preselected.
 * @property paypal - The PayPal route. Absent when the page names no address.
 * @property sponsors - The GitHub Sponsors route, shown at every interval
 *   because it is the one way here that carries a real monthly subscription.
 * @property labels - Wording overrides for everything outside the child nodes.
 *   Anything absent falls back to `SUPPORT_LADDER_LABEL_DEFAULTS`.
 */
interface SupportLadderProps {
  bankAccount?: SupportLadderBankAccount;
  intervals: SupportLadderInterval[];
  /** Every route out of the page, in the order the document names them. */
  routes: SupportLadderRoute[];
  labels?: Partial<Record<SupportLadderLabelKey, string>>;
}

/**
 * Constructed once at module scope rather than inside the render, because the
 * call that formats is also the call that builds the formatter.
 */
const EURO_WHOLE = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const EURO_EXACT = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const MONTHS_PER_YEAR = 12;

/**
 * The currency symbol, taken from the formatter rather than typed out, so it
 * follows the locale the amounts are already formatted in.
 */
const CURRENCY_SYMBOL =
  EURO_WHOLE.formatToParts(0).find((part) => part.type === "currency")?.value ?? "€";

/** Fallbacks for anything the page's `[[qrcode]]` node does not name. */
const QR_DEFAULTS = {
  size: 176,
  margin: 8,
  color: "#292524",
  background: "#ffffff",
  dots: "rounded",
  corners: "extra-rounded",
} as const;

/**
 * Placeholder inside an interval's text that is replaced with the yearly total
 * of the chosen amount.
 *
 * Showing that total is the one thing found to reverse the reluctance to accept
 * a recurring ask, so a text that drops the placeholder loses the effect.
 */
const YEARLY_TOTAL_PLACEHOLDER = "[[annualAmount]]";

/** Groups an IBAN into blocks of four, which is how a person reads one back. */
function groupIban(iban: string): string {
  return iban
    .replace(/\s+/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

/**
 * The amount an interval starts on.
 *
 * The page decides by flagging one option `recommended`. Without a flag the
 * second rung is taken, which is low enough not to hide the cheapest option and
 * high enough not to anchor the visitor on it.
 */
function startingAmount(interval: SupportLadderInterval | undefined): number {
  if (!interval || interval.options.length === 0) return 0;
  const flagged = interval.options.find((option) => option.recommended);
  if (flagged) return flagged.amountEur;
  return interval.options[Math.min(1, interval.options.length - 1)].amountEur;
}

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
function RichText({ html, className, style }: { html: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`lmaa-rich ${className ?? ""}`}
      style={style}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: page content, rendered and sanitised server-side by renderMarkdownSSR
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Width of a brand mark beside a block heading, in pixels.
 *
 * The collection draws every logo on a 3:2 card, so the height follows from the
 * width rather than being chosen.
 */
const ROUTE_ICON_PX = 72;

/**
 * Width of a brand lockup, in pixels.
 *
 * A lockup carries the word beside the mark, so it is wider than a payment
 * logo whilst the mark inside it comes out at about that logo's height. The
 * height follows from the file, so each brand keeps its own proportions and
 * every lockup ends at the same edge.
 */
const BRAND_MARK_PX = 116;

/**
 * The logos a brand publishes itself, each taken from that brand's own pack.
 *
 * They are used where a block is that brand's route out of the page, which is
 * what the trademark holders permit their marks to be used for.
 */
const BRAND_MARKS: Record<string, { url: string; width: number }> = {
  github: { url: githubLockupUrl, width: BRAND_MARK_PX },
  sepa: { url: sepaLockupUrl, width: BRAND_MARK_PX },
  // PayPal draws its lockup without the margin GitHub builds into theirs, so it
  // is set two pixels narrower to carry the same weight beside it.
  paypal: { url: paypalLockupUrl, width: BRAND_MARK_PX - 2 },
};

/**
 * The brand mark of a payment route.
 *
 * Marks come from the same collection the shop detail pages use, so a PayPal
 * logo looks here exactly as it looks there. GitHub is the one exception and
 * takes Phosphor's mark, because the collection holds payment methods only. It
 * is drawn on the same card so the three sit together as one set.
 *
 * The collection greys its logos in their resting state and shows full colour
 * only on hover, which suits a row of many. Here each block carries a single
 * mark, so the filter is switched off and the brand colours stand.
 *
 * An unknown name draws nothing rather than a placeholder, so a typo in the
 * page content costs the mark and not the block.
 */
function RouteIcon({ name }: { name?: string }) {
  if (!name) return null;

  const lockup = BRAND_MARKS[name];
  if (lockup) {
    return (
      <img
        src={lockup.url}
        alt=""
        aria-hidden="true"
        className="shrink-0"
        style={{ width: lockup.width, height: "auto" }}
      />
    );
  }

  const definition = PAYMENT_METHOD_MAP.get(name as never);
  if (!definition) return null;

  const Mark = definition.icon;
  return (
    <span className="lmaa-route-icon inline-flex shrink-0">
      <Mark aria-hidden={true} size={ROUTE_ICON_PX} />
    </span>
  );
}

/**
 * An outgoing payment route, drawn as a card with a link.
 *
 * PayPal and GitHub Sponsors look the same and differ only in when the ladder
 * shows them, so they share this rather than each carrying a copy.
 */
function OutboundRoute({ route }: { route: SupportLadderRoute }) {
  return (
    <div
      className="mt-3 p-4 border"
      style={{
        borderRadius: "var(--radius-card)",
        background: "var(--ds-surface)",
        borderColor: "var(--ds-border-subtle)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold" style={{ fontFamily: "var(--ds-font-serif)" }}>
          {route.title}
        </h3>
        <RouteIcon name={route.icon} />
      </div>
      {route.text && (
        <RichText
          html={route.text}
          className="mt-1 text-sm"
          style={{ color: "var(--ds-text-muted)" }}
        />
      )}
      <a
        href={route.url}
        rel="noopener noreferrer"
        target="_blank"
        className="mt-6 inline-flex items-center gap-2 h-9 px-4 rounded-full border text-sm font-semibold"
        style={{ borderColor: "var(--ds-border)", color: "var(--ds-text)" }}
      >
        {route.button}
        <ArrowSquareOutIcon weight="duotone" aria-hidden="true" className="size-4" />
      </a>
    </div>
  );
}

/**
 * A notice inside a payment block, drawn as a tinted sub-card.
 *
 * The icon is aligned with the first line of the text rather than with the
 * block as a whole, so a notice running to three lines does not leave the icon
 * floating in the middle. Its box is one line tall and centres its contents,
 * which puts it on the first line's optical centre whatever the text does
 * afterwards. It takes the card's own colour, because it is part of the notice
 * rather than a second signal.
 */
function InfoCard({ text }: { text: string }) {
  return (
    <div
      className="mt-4 flex gap-2 p-3 text-sm"
      style={{
        borderRadius: "var(--radius-control)",
        background: "var(--ds-info-bg)",
        border: "1px solid var(--ds-info-border)",
        color: "var(--ds-info-text)",
        lineHeight: "var(--ds-leading-sm)",
      }}
    >
      <span
        aria-hidden="true"
        className="flex shrink-0 items-center"
        style={{ height: "calc(1em * var(--ds-leading-sm))" }}
      >
        <InfoIcon weight="duotone" className="size-4" />
      </span>
      <RichText html={text} />
    </div>
  );
}

/**
 * The suggested amounts of one interval, plus its free-amount field.
 *
 * Separated from the ladder because it is the only part that changes when the
 * visitor picks an amount, and because the ladder is otherwise long enough to
 * hide it.
 */
function AmountGrid({
  interval,
  amountEur,
  customAmount,
  perMonthLabel,
  onChoose,
  onCustom,
}: {
  interval: SupportLadderInterval;
  amountEur: number;
  customAmount: string;
  perMonthLabel: string;
  onChoose: (amountEur: number) => void;
  onCustom: (value: string) => void;
}) {
  // A value in the free field is the choice, so no suggested amount is active
  // whilst it holds one.
  const customActive = customAmount.trim() !== "";

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
            className="relative flex flex-col gap-1.5 p-4 text-left border transition-transform hover:-translate-y-0.5"
            style={{
              borderRadius: "var(--radius-card)",
              background: active ? "var(--ds-accent-tint)" : "var(--ds-surface)",
              borderColor: active ? "var(--ds-accent)" : "var(--ds-border-subtle)",
            }}
          >
            <span
              className="text-xl leading-none font-bold tabular-nums"
              style={{ fontFamily: "var(--ds-font-serif)" }}
            >
              {EURO_WHOLE.format(option.amountEur)}
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
                className="absolute top-4 right-4 size-5"
                style={{ color: "var(--ds-accent)" }}
              />
            )}
          </button>
        );
      })}

      {interval.custom && (
        <label
          className="flex flex-col gap-1.5 p-4 border border-dashed"
          style={{
            borderRadius: "var(--radius-card)",
            borderColor: customActive ? "var(--ds-accent)" : "var(--ds-border)",
            background: customActive ? "var(--ds-accent-tint)" : "transparent",
          }}
        >
          <span className="text-sm" style={{ color: "var(--ds-text-muted)" }}>
            {interval.custom.label}
          </span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="text-xl leading-none font-bold"
              style={{ fontFamily: "var(--ds-font-serif)" }}
            >
              {CURRENCY_SYMBOL}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={customAmount}
              placeholder={interval.custom.placeholder}
              aria-label={`${interval.custom.label} in Euro`}
              onChange={(event) => onCustom(event.target.value)}
              // Wide enough for a five-figure amount and no wider, because the
              // field should look like what belongs in it.
              className="h-9 w-24 px-3 border rounded-control tabular-nums"
              style={{
                background: "var(--ds-surface)",
                borderColor: "var(--ds-border)",
                color: "var(--ds-text)",
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
              className="text-sm"
              style={{ color: "var(--ds-text-muted)" }}
            />
          )}
        </label>
      )}
    </div>
  );
}

/**
 * The amount ladder and the payment details of the support page.
 *
 * Two things drive the design and both come from what comparable projects
 * publish. The lowest rung governs how many people give at all whilst the
 * highest governs how much they give, so a ladder runs low to high. And every
 * rung says what that amount pays for, because an amount without a purpose is a
 * number the reader has to judge on their own.
 *
 * The GiroCode is shown for a single payment only. EPC069-12 has no field for
 * an interval, so a code cannot express a standing order, and the monthly case
 * gets the same details as text with an explanation instead.
 */
export default function SupportLadder({
  bankAccount,
  intervals,
  routes,
  labels,
}: SupportLadderProps) {
  // Merged once per render rather than looked up per label, and the defaults
  // are the only place the wording exists when the shortcode says nothing.
  const text = { ...SUPPORT_LADDER_LABEL_DEFAULTS, ...labels };

  const [intervalKey, setIntervalKey] = useState(intervals[0]?.key ?? "once");
  const interval = intervals.find((entry) => entry.key === intervalKey) ?? intervals[0];

  const [amountEur, setAmountEur] = useState(() => startingAmount(intervals[0]));
  const [customAmount, setCustomAmount] = useState("");

  const qrRef = useRef<HTMLDivElement>(null);

  // A recurring payment is a standing order the payer sets up, so there is
  // nothing for a one-off transfer code to carry.
  const showQr = intervalKey === "once" && Boolean(bankAccount);
  const qr = bankAccount?.variants.find((entry) => entry.key === intervalKey)?.qr;
  const qrSize = qr?.size ?? QR_DEFAULTS.size;
  const qrBackground = qr?.background ?? QR_DEFAULTS.background;
  const qrMargin = qr?.margin ?? QR_DEFAULTS.margin;

  // The renderer takes its quiet zone out of the canvas it is given, so asking
  // for a larger zone would shrink the code and move it. Drawing on a canvas
  // enlarged by the zone on both sides, and pulling the drawing back by exactly
  // that amount, keeps two promises at once: `size` is the edge length of the
  // code a reader sees, and the code's top-left corner is the top-left of its
  // box, flush with the details beside it.
  const qrCanvas = qrSize + qrMargin * 2;



  const payload = useMemo(() => {
    if (!showQr || !bankAccount) return null;
    try {
      return buildEpcQrPayload({
        beneficiaryName: bankAccount.beneficiaryName,
        iban: bankAccount.iban,
        bic: bankAccount.bic,
        amountEur: amountEur > 0 ? amountEur : undefined,
        remittance: bankAccount.purpose,
      });
    } catch {
      // A malformed payee is a content mistake. The details stay readable as
      // text below, so the block degrades to something still usable.
      return null;
    }
  }, [showQr, bankAccount, amountEur]);

  useEffect(() => {
    if (!qrRef.current || !payload) return;

    let cancelled = false;
    void import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      const node = qrRef.current;
      if (cancelled || !node) return;

      const qrCode = new QRCodeStyling({
        width: qrCanvas,
        height: qrCanvas,
        data: payload,
        margin: qrMargin,
        type: "svg",
        dotsOptions: {
          color: qr?.color ?? QR_DEFAULTS.color,
          type: (qr?.dots ?? QR_DEFAULTS.dots) as "rounded",
        },
        cornersSquareOptions: {
          color: qr?.color ?? QR_DEFAULTS.color,
          type: (qr?.corners ?? QR_DEFAULTS.corners) as "extra-rounded",
        },
        cornersDotOptions: { color: qr?.color ?? QR_DEFAULTS.color, type: "dot" },
        // Drawn by the container instead, so the measurement below sees only
        // the modules and not a background rectangle covering the whole canvas.
        backgroundOptions: { color: "transparent" },
        ...(qr?.image ? { image: qr.image } : {}),
      });

      node.replaceChildren();
      qrCode.append(node);

    });

    return () => {
      cancelled = true;
    };
  }, [payload, qr, qrCanvas, qrMargin]);

  function chooseInterval(key: SupportLadderInterval["key"]) {
    setIntervalKey(key);
    setCustomAmount("");
    setAmountEur(startingAmount(intervals.find((entry) => entry.key === key)));
  }

  function chooseCustom(value: string) {
    // What the field holds is the cleaned value, so grouping separators, stray
    // characters, and a third decimal never survive a keystroke.
    const cleaned = normalizeAmountInput(value);
    setCustomAmount(cleaned);

    // Emptying the field hands the choice back to the ladder, so the
    // recommended amount becomes the active one again.
    if (cleaned === "") {
      setAmountEur(startingAmount(interval));
      return;
    }

    const amount = readAmountInput(cleaned);
    if (amount !== null) setAmountEur(amount);
  }

  if (!interval) return null;

  const variant = bankAccount?.variants.find((entry) => entry.key === intervalKey);
  const yearlyTotal = amountEur * MONTHS_PER_YEAR;
  const intervalText = interval.text.replaceAll(
    YEARLY_TOTAL_PLACEHOLDER,
    EURO_WHOLE.format(yearlyTotal),
  );

  return (
    <section>
      {intervals.length > 1 && (
        <>
          <fieldset
            aria-label={text.frequencyGroup}
            className="inline-flex gap-1 p-1 m-0 rounded-full border"
            style={{
              background: "var(--ds-surface-inset)",
              borderColor: "var(--ds-border-subtle)",
            }}
          >
            {intervals.map((entry) => {
              const active = entry.key === intervalKey;
              return (
                <button
                  key={entry.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseInterval(entry.key)}
                  className="h-8 px-4 rounded-full text-sm border transition-colors"
                  style={{
                    background: active ? "var(--ds-surface)" : "transparent",
                    borderColor: active ? "var(--ds-border)" : "transparent",
                    color: active ? "var(--ds-text)" : "var(--ds-text-muted)",
                    fontWeight: active ? 600 : 500,
                    boxShadow: active ? "var(--ds-shadow-sm)" : "none",
                  }}
                >
                  {entry.label}
                </button>
              );
            })}
          </fieldset>

          {intervalText && (
            <RichText
              html={intervalText}
              className="mt-3 text-sm"
              style={{ color: "var(--ds-text-subtle)" }}
            />
          )}
        </>
      )}

      <AmountGrid
        interval={interval}
        amountEur={amountEur}
        customAmount={customAmount}
        perMonthLabel={text.perMonth}
        onChoose={(next) => {
          setCustomAmount("");
          setAmountEur(next);
        }}
        onCustom={chooseCustom}
      />

      {bankAccount && variant && (
        <div
          className="mt-6 p-4 border"
          style={{
            borderRadius: "var(--radius-card)",
            background: "var(--ds-surface)",
            borderColor: variant.recommended
              ? "color-mix(in srgb, var(--ds-accent) 45%, transparent)"
              : "var(--ds-border-subtle)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-lg font-semibold" style={{ fontFamily: "var(--ds-font-serif)" }}>
              {variant.title}
            </h3>
            <RouteIcon name={variant.icon} />
          </div>
          {variant.text && (
            <RichText
              html={variant.text}
              className="mt-1 text-sm"
              style={{ color: "var(--ds-text-muted)" }}
            />
          )}

          <div className="mt-6 flex flex-wrap gap-6">
            {showQr && payload && (
              <div
                ref={qrRef}
                aria-label={text.qrAlt}
                className="lmaa-qr shrink-0 relative"
                style={{
                  width: qrSize,
                  height: qrSize,
                  // The quiet zone is drawn outside the box, so it neither
                  // shrinks the code nor shifts it away from the text.
                  ["--qr-inset" as string]: `${-qrMargin}px`,
                  background: qrBackground,
                }}
              />
            )}

            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm content-start min-w-[16rem] flex-1">
              <dt style={{ color: "var(--ds-text-subtle)" }}>{text.fieldName}</dt>
              <dd className="m-0 font-mono font-semibold text-[0.92em]">{bankAccount.beneficiaryName}</dd>
              <dt style={{ color: "var(--ds-text-subtle)" }}>{text.fieldIban}</dt>
              <dd className="m-0 font-mono font-semibold text-[0.92em] break-all">
                {groupIban(bankAccount.iban)}
              </dd>
              {bankAccount.bic && (
                <>
                  <dt style={{ color: "var(--ds-text-subtle)" }}>{text.fieldBic}</dt>
                  <dd className="m-0 font-mono font-semibold text-[0.92em]">{bankAccount.bic}</dd>
                </>
              )}
              {bankAccount.purpose && (
                <>
                  <dt style={{ color: "var(--ds-text-subtle)" }}>{text.fieldPurpose}</dt>
                  <dd className="m-0 font-mono font-semibold text-[0.92em]">{bankAccount.purpose}</dd>
                </>
              )}
              <dt style={{ color: "var(--ds-text-subtle)" }}>{text.fieldAmount}</dt>
              <dd className="m-0 font-mono font-semibold text-[0.92em]">
                {amountEur > 0 ? EURO_EXACT.format(amountEur) : text.amountOpen}
                {interval.key === "monthly" && amountEur > 0 ? ` ${text.perMonth}` : ""}
              </dd>
            </dl>
          </div>

          {variant.info && <InfoCard text={variant.info} />}
        </div>
      )}

      {/* The document decides the order. PayPal.Me pays once, so it stands
          under the single payment only; Sponsors carries a subscription and
          therefore stands under both. */}
      {routes
        .filter((route) => route.token !== "paypalme" || intervalKey === "once")
        .map((route) => (
          <OutboundRoute key={`${route.token}-${route.url}`} route={route} />
        ))}

    </section>
  );
}
