import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import type * as React from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import type { PendingSponsorshipReceipt } from "@lmaa/contracts";
import {
  buildEpcQrPayload,
  SUPPORT_LADDER_LABEL_DEFAULTS,
  type SupportLadderLabelKey,
} from "@lmaa/shared";
import { PAYMENT_METHOD_MAP } from "@lmaa/ui";


import githubLockupUrl from "@/assets/brands/github-lockup.svg?url";
import paypalLockupUrl from "@/assets/brands/paypal-lockup.svg?url";
import sepaLockupUrl from "@/assets/brands/sepa-lockup.svg?url";
import SponsorForm from "@/components/islands/SponsorForm";
import { normalizeAmountInput, readAmountInput } from "@/lib/amount-input";
import type {
  SupportLadderBankAccount,
  SupportLadderInterval,
  SupportLadderRoute,
} from "@/lib/content-shortcode-segments";
import { buttonBaseClass } from "@/lib/form-styles";
import {
  forgetIssuedSponsorship,
  getIssuedSponsorship,
  getServerIssuedSponsorship,
  rememberIssuedSponsorship,
  subscribeIssuedSponsorship,
} from "@/lib/pending-sponsorship-store";

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
  /**
   * The least a sponsor gives to stand on the page for a year, in euro.
   *
   * Kept in the dashboard rather than in the page, because it is the same
   * number the sponsor list is judged by. A tab without suggested amounts opens
   * on it.
   */
  minSponsorAmountEur?: number;
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
 * How long the body takes to fade before it shows the tab just chosen.
 *
 * The same figure stands in the stylesheet, which is where the fading itself
 * lives. Both are short: long enough to read as a change of scene, short enough
 * that nobody waits for it.
 */
const BODY_FADE_MS = 140;

/** The label of one line on the transfer card. */
const TRANSFER_LABEL_STYLE = { color: "var(--ds-text-subtle)" };

/**
 * One value on the transfer card.
 *
 * Monospaced, because these are figures somebody copies into a banking app and
 * compares character by character. The slight reduction takes back the width a
 * monospaced face gains over the body face at the same size.
 */
const TRANSFER_VALUE_CLASS = "m-0 font-mono font-semibold text-[0.92em]";

/**
 * The currency symbol, taken from the formatter rather than typed out, so it
 * follows the locale the amounts are already formatted in.
 */
const CURRENCY_SYMBOL =
  EURO_WHOLE.formatToParts(0).find((part) => part.type === "currency")?.value ?? "€";

/**
 * Notes the reference the site has just issued, with the moment it happened.
 *
 * The moment is taken here rather than from the server, because what it decides
 * is when this browser stops showing the reference, and that is a decision
 * about this browser.
 */
function keepIssued(receipt: PendingSponsorshipReceipt) {
  rememberIssuedSponsorship({ ...receipt, issuedAt: Date.now() });
}

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
const YEARLY_TOTAL_PLACEHOLDER = "{annualAmount}";

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
function startingAmount(interval: SupportLadderInterval | undefined, floorEur = 0): number {
  // A tab that suggests nothing opens on the floor it names instead, which is
  // what the sponsor tab does: there is one amount that counts, the least one.
  if (!interval || interval.options.length === 0) return floorEur;
  const flagged = interval.options.find((option) => option.recommended);
  if (flagged) return flagged.amountEur;
  return interval.options[Math.min(1, interval.options.length - 1)].amountEur;
}

/**
 * What the free field holds when a tab opens.
 *
 * A tab with suggested amounts leaves it empty, because one of those amounts is
 * the choice until somebody types. A tab without them has nothing else to show,
 * so its floor stands in the field ready to be changed.
 *
 * @param interval - The tab being opened.
 * @param floorEur - The least amount that tab accepts, in euro.
 * @returns What to put in the field.
 */
function startingCustomAmount(interval: SupportLadderInterval | undefined, floorEur: number): string {
  if (!interval || interval.options.length > 0 || floorEur <= 0) return "";
  return String(floorEur);
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
function RichText({
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
const BRAND_MARK_PX = 102;

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
/** Frames allowed for a drawing to appear before the trim gives up. */
const TRIM_ATTEMPTS = 30;

/**
 * Makes the drawn code fill its box.
 *
 * The renderer fits whole pixels per module, so a canvas that is not an exact
 * multiple of the module count keeps the remainder as padding and centres the
 * code inside it. That padding reads as a margin nobody asked for, and it
 * changes with the data, because the amount decides how many modules there are.
 *
 * The fix crops rather than deletes, because the modules are drawn as clipping
 * masks that a full-size rectangle is poured through. Deleting anything there
 * takes the code with it.
 *
 * What is measured are the three finder patterns, the squares a scanner looks
 * for. Every QR code carries them flush with its corners, so their extent is
 * the code's extent, and that extent becomes the `viewBox`.
 *
 * @param node - The element the renderer drew into.
 * @returns `true` once a drawing was found and cropped, `false` whilst there is
 *   nothing to crop yet.
 */
function fitSvgToDrawing(node: HTMLElement): boolean {
  const svg = node.querySelector("svg");
  if (!svg) return false;

  const canvas = Number(svg.getAttribute("width"));
  if (!canvas) return false;

  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const shape of Array.from(svg.querySelectorAll<SVGRectElement>(":scope > rect"))) {
    const width = shape.width.baseVal.value;
    const height = shape.height.baseVal.value;
    // The layers that carry the modules span the whole canvas and say nothing
    // about where the code sits. The finder patterns are the ones that do.
    if (width >= canvas || height >= canvas) continue;

    const x = shape.x.baseVal.value;
    const y = shape.y.baseVal.value;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + width);
    bottom = Math.max(bottom, y + height);
  }

  if (!Number.isFinite(left) || right <= left || bottom <= top) return false;

  svg.setAttribute("viewBox", `${left} ${top} ${right - left} ${bottom - top}`);
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  return true;
}

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
      className="lmaa-card lmaa-payment-card mt-3"
      style={{
        border: "var(--card-border-width) solid",
        padding: "var(--card-padding)",
        borderRadius: "var(--radius-card)",
        background: "var(--ds-surface)",
        borderColor: "var(--ds-border-subtle)",
      }}
    >
      <div className="lmaa-card-head flex items-start justify-between gap-4">
        <h3
          className="font-semibold"
          style={{
            fontFamily: "var(--ds-font-serif)",
            fontSize: "var(--ds-text-lg)",
            lineHeight: "var(--ds-leading-lg)",
          }}
        >
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
        className="mt-6 ml-auto flex w-fit items-center gap-2 h-9 px-4 text-sm font-semibold transition-colors"
        style={{
          borderRadius: "var(--radius-card-inner)",
          // The accent draws the line, the wash behind it only lifts the button
          // off the card. Filled with the accent itself it would shout, and the
          // text on it would need a colour of its own to stay readable.
          border: "var(--card-border-width) solid var(--ds-accent)",
          background: "var(--ds-accent-tint)",
          // The accent's own colour, two steps darker than the line: the line
          // itself measures 2.01:1 on this wash, this shade measures 6.12:1.
          color: "var(--ds-accent-text)",
        }}
      >
        {route.button}
        <ArrowSquareOutIcon weight="duotone" aria-hidden="true" className="size-4" />
      </a>
    </div>
  );
}

/**
 * A notice about a payment block, drawn as a tinted card.
 *
 * The icon is aligned with the first line of the text rather than with the
 * block as a whole, so a notice running to three lines does not leave the icon
 * floating in the middle. Its box is one line tall and centres its contents,
 * which puts it on the first line's optical centre whatever the text does
 * afterwards. It takes the card's own colour, because it is part of the notice
 * rather than a second signal.
 *
 * Inside a block it is a nested surface and carries the nested radius. Beside
 * one it is a card in its own right, so it takes the same radius and the same
 * padding as the card it stands next to.
 *
 * @param text - The notice, as HTML from the page's own Markdown.
 * @param className - Spacing decided by where it is used.
 * @param beside - Whether it stands next to a card rather than inside one.
 */
function InfoCard({
  text,
  className = "mt-4",
  beside = false,
}: {
  text: string;
  className?: string;
  beside?: boolean;
}) {
  return (
    <div
      className={`flex gap-2 text-sm ${beside ? "" : "p-3"} ${className}`}
      style={{
        borderRadius: beside ? "var(--radius-card)" : "var(--radius-card-inner)",
        padding: beside ? "var(--card-padding)" : undefined,
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
  className = "",
  minimumEur = 0,
  minimumNotice = "",
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
    <div
      className={`grid gap-3 ${hasOptions ? "sm:grid-cols-2 lg:grid-cols-4" : ""} ${className}`}
    >
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
          className={`lmaa-card flex flex-col gap-1.5 ${
            hasOptions ? "col-span-full sm:col-span-2 lg:col-span-2 lg:col-start-2" : ""
          }`}
          style={{
            border: "var(--card-border-width) dashed",
            padding: "var(--card-padding)",
            borderRadius: "var(--radius-card)",
            // It stands half a step off the page rather than on the same white
            // as the amounts, because it is a field to fill in rather than one
            // more thing to pick. The line is the one the amounts carry, so the
            // dash alone tells it apart.
            borderColor: customActive ? "var(--ds-accent)" : "var(--ds-border-subtle)",
            background: customActive ? "var(--ds-accent-tint)" : "var(--ds-surface-soft)",
          }}
        >
          {/* A heading, like the one every other block of this ladder carries,
              because it names what the card is rather than labelling the field
              inside it. The field states its own name to a screen reader. */}
          <h3
            className="font-semibold"
            style={{
              fontFamily: "var(--ds-font-serif)",
              fontSize: "var(--ds-text-lg)",
              lineHeight: "var(--ds-leading-lg)",
            }}
          >
            {interval.custom.label}
          </h3>
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
              onChange={(event) => {
                setLeftTheField(false);
                onCustom(event.target.value);
              }}
              onBlur={() => setLeftTheField(true)}
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
          {/* Said rather than refused. Nothing is submitted here: the transfer
              happens in the reader's own bank, so the field cannot stop an
              amount, only say what it will and will not earn. */}
          {belowMinimum && minimumNotice && (
            <RichText
              html={minimumNotice}
              className="text-sm"
              role="status"
              style={{ color: "var(--ds-warning-text)" }}
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
  minSponsorAmountEur = 0,
}: SupportLadderProps) {
  // Merged once per render rather than looked up per label, and the defaults
  // are the only place the wording exists when the shortcode says nothing.
  const text = { ...SUPPORT_LADDER_LABEL_DEFAULTS, ...labels };

  const [intervalKey, setIntervalKey] = useState(intervals[0]?.key ?? "once");
  /**
   * Which tab the body below is showing.
   *
   * It follows the switch a moment later, so the old content has time to fade
   * out before the new one takes its place. The switch itself moves at once,
   * because that is the thing the reader just clicked.
   */
  const [shownKey, setShownKey] = useState(intervals[0]?.key ?? "once");
  const interval = intervals.find((entry) => entry.key === shownKey) ?? intervals[0];
  const swapTimer = useRef<number | null>(null);

  /** Where the marker sits, read from the tab it belongs to after layout. */
  const tabsRef = useRef<HTMLFieldSetElement>(null);
  const [marker, setMarker] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;

    // Read from the tab itself rather than computed from labels, because what
    // the marker has to cover is whatever the type happens to measure.
    function place() {
      const active = tabs?.querySelector<HTMLElement>(`[data-interval="${intervalKey}"]`);
      if (active) setMarker({ left: active.offsetLeft, width: active.offsetWidth });
    }

    place();
    const observer = new ResizeObserver(place);
    observer.observe(tabs);
    return () => observer.disconnect();
  }, [intervalKey]);

  useEffect(
    () => () => {
      if (swapTimer.current !== null) window.clearTimeout(swapTimer.current);
    },
    [],
  );

  const [amountEur, setAmountEur] = useState(() =>
    startingAmount(intervals[0], minSponsorAmountEur),
  );
  const [customAmount, setCustomAmount] = useState(() =>
    startingCustomAmount(intervals[0], minSponsorAmountEur),
  );

  const qrRef = useRef<HTMLDivElement>(null);

  /**
   * The reference this reader has already been given, if any.
   *
   * It lives in the browser rather than in this component, so the page can be
   * rendered on the server without it and a second tab of the same site does
   * not go on showing a reference this one has replaced.
   */
  const issued = useSyncExternalStore(
    subscribeIssuedSponsorship,
    getIssuedSponsorship,
    getServerIssuedSponsorship,
  );



  // A recurring payment is a standing order the payer sets up, so there is
  // nothing for a one-off transfer code to carry. A sponsorship is paid once
  // for the year, so it carries one like any other single transfer.
  const showQr = shownKey !== "monthly" && Boolean(bankAccount);
  // A tab that draws no block of its own borrows the single payment's, because
  // that is the same transfer with a different reference.
  const qrVariant =
    bankAccount?.variants.find((entry) => entry.key === shownKey) ??
    bankAccount?.variants.find((entry) => entry.key === "once");
  const qr = qrVariant?.qr;
  const qrSize = qr?.size ?? QR_DEFAULTS.size;
  const qrBackground = qr?.background ?? QR_DEFAULTS.background;
  const qrMargin = qr?.margin ?? QR_DEFAULTS.margin;



  /**
   * What the payer should write on the transfer.
   *
   * A sponsorship has to be recognisable as one on the statement, which the
   * ordinary reference is not, so the account names a second one for it. It
   * applies whilst the amount earns it: below what the sponsor tab asks for the
   * payment is a donation, and the reference is what it gets booked as.
   */
  const earnsSponsorPurpose =
    shownKey === "sponsor" && minSponsorAmountEur > 0 && amountEur >= minSponsorAmountEur;
  /**
   * The reference the transfer carries, once this reader has been given one.
   *
   * It replaces the sentence rather than joining it: the code holds one of the
   * two and never both, and the reference is the half that survives the payer's
   * app and the banks in between.
   */
  const creditorReference = shownKey === "sponsor" ? issued?.reference : undefined;
  const remittance = creditorReference
    ? undefined
    : (earnsSponsorPurpose ? bankAccount?.purposeSponsor : undefined) ||
      bankAccount?.purposeDonation;

  const payload = useMemo(() => {
    if (!showQr || !bankAccount) return null;
    try {
      return buildEpcQrPayload({
        beneficiaryName: bankAccount.beneficiaryName,
        iban: bankAccount.iban,
        bic: bankAccount.bic,
        amountEur: amountEur > 0 ? amountEur : undefined,
        remittance,
        creditorReference,
      });
    } catch {
      // A malformed payee is a content mistake. The details stay readable as
      // text below, so the block degrades to something still usable.
      return null;
    }
  }, [showQr, bankAccount, amountEur, remittance, creditorReference]);

  useEffect(() => {
    if (!qrRef.current || !payload) return;

    let cancelled = false;
    void import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      const node = qrRef.current;
      if (cancelled || !node) return;

      const qrCode = new QRCodeStyling({
        width: qrSize,
        height: qrSize,
        data: payload,
        // The quiet zone is painted by the container as a ring outside the box,
        // so the renderer draws the code alone and nothing else.
        margin: 0,
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

      // The drawing arrives on a later turn when the code carries an image, so
      // the trim is attempted again until there is something to trim.
      let attempts = 0;
      const trim = () => {
        if (cancelled) return;
        if (fitSvgToDrawing(node)) return;
        attempts += 1;
        if (attempts < TRIM_ATTEMPTS) requestAnimationFrame(trim);
      };
      trim();
    });

    return () => {
      cancelled = true;
    };
  }, [payload, qr, qrSize]);

  function chooseInterval(key: SupportLadderInterval["key"]) {
    if (key === intervalKey) return;

    // The switch answers the click straight away; the body follows once it has
    // faded, so the two states are never both half visible.
    setIntervalKey(key);

    if (swapTimer.current !== null) window.clearTimeout(swapTimer.current);
    swapTimer.current = window.setTimeout(() => {
      const next = intervals.find((entry) => entry.key === key);
      setShownKey(key);
      setCustomAmount(startingCustomAmount(next, minSponsorAmountEur));
      setAmountEur(startingAmount(next, minSponsorAmountEur));
      swapTimer.current = null;
    }, BODY_FADE_MS);
  }

  function chooseCustom(value: string) {
    // What the field holds is the cleaned value, so grouping separators, stray
    // characters, and a third decimal never survive a keystroke.
    const cleaned = normalizeAmountInput(value);
    setCustomAmount(cleaned);

    // Emptying the field hands the choice back to the ladder, so the
    // recommended amount becomes the active one again.
    if (cleaned === "") {
      setAmountEur(startingAmount(interval, minSponsorAmountEur));
      return;
    }

    const amount = readAmountInput(cleaned);
    if (amount !== null) setAmountEur(amount);
  }

  if (!interval) return null;

  const variant = qrVariant;
  const yearlyTotal = amountEur * MONTHS_PER_YEAR;
  const intervalText = interval.text.replaceAll(
    YEARLY_TOTAL_PLACEHOLDER,
    EURO_WHOLE.format(yearlyTotal),
  );

  return (
    <section>
      {intervals.length > 1 && (
        // The explanation and the switch share one row, with the switch on the
        // right. Both start at the top, so an explanation running to two lines
        // grows downwards instead of pushing itself off the switch's centre.
        // They stack on a narrow screen rather than being squeezed.
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          {intervalText && (
            <RichText
              html={intervalText}
              className="min-w-0 flex-1 text-sm"
              style={{ color: "var(--ds-text-subtle)" }}
            />
          )}
          <fieldset
            ref={tabsRef}
            aria-label={text.frequencyGroup}
            className="lmaa-segments ml-auto inline-flex gap-1 m-0 rounded-full border"
            style={{
              background: "var(--ds-surface-inset)",
              borderColor: "var(--ds-border-subtle)",
            }}
          >
            {/* The mark under the chosen tab, which slides rather than jumping.
                It is one element that moves, so the tabs themselves carry no
                background of their own to fade. Until it has been measured the
                tab keeps its own, so nothing flashes before hydration. */}
            {marker.width > 0 && (
              <span
                aria-hidden="true"
                className="lmaa-segment-marker"
                style={{ transform: `translateX(${marker.left}px)`, width: `${marker.width}px` }}
              />
            )}
            {intervals.map((entry) => {
              const active = entry.key === intervalKey;
              const marked = active && marker.width > 0;
              return (
                <button
                  key={entry.key}
                  data-interval={entry.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseInterval(entry.key)}
                  className="relative h-8 px-4 rounded-full text-sm border transition-colors"
                  style={{
                    background: active && !marked ? "var(--ds-surface)" : "transparent",
                    borderColor: active && !marked ? "var(--ds-border)" : "transparent",
                    color: active ? "var(--ds-text)" : "var(--ds-text-muted)",
                    fontWeight: active ? 600 : 500,
                    boxShadow: active && !marked ? "var(--ds-shadow-sm)" : "none",
                  }}
                >
                  {entry.label}
                </button>
              );
            })}
          </fieldset>
        </div>
      )}

      {/* Everything the tab decides fades out together and comes back as the
          tab just chosen. Only its opacity moves, so the change costs a
          composite rather than a repaint of everything inside it. */}
      <div className={`lmaa-ladder-body${intervalKey === shownKey ? "" : " is-fading"}`}>
      {/* What this tab is, where it is not self-evident from its amounts, and
          what it asks for. A tab of suggested amounts needs the whole width for
          them and puts any notice above; a tab with a single field has room to
          set the two beside each other, and they are read together. */}
      <div
        className={`mt-6 grid gap-3 ${
          interval.hint && interval.options.length === 0 ? "md:grid-cols-2" : ""
        }`}
      >
        {interval.hint && (
          <InfoCard
            text={interval.hint}
            className="mt-0"
            beside={interval.options.length === 0}
          />
        )}

        <AmountGrid
          // A fresh tab starts without a complaint about the tab before it.
          key={shownKey}
          interval={interval}
          amountEur={amountEur}
          customAmount={customAmount}
          perMonthLabel={text.perMonth}
          onChoose={(next) => {
            setCustomAmount("");
            setAmountEur(next);
          }}
          onCustom={chooseCustom}
          // The floor belongs to the tab that earns something by it, which is
          // the sponsor tab and no other.
          minimumEur={shownKey === "sponsor" ? minSponsorAmountEur : 0}
          minimumNotice={(interval.belowMinimum ?? "").replaceAll(
            "{min}",
            EURO_WHOLE.format(minSponsorAmountEur),
          )}
        />
      </div>

      {/* The sponsor tab asks for what the payment cannot carry, before it shows
          the payment. Reading down the tab then runs in the order the thing
          actually happens: choose the amount, say who you are, take the
          reference to the bank. */}
      {shownKey === "sponsor" &&
        (issued ? (
          <div
            className="lmaa-card mt-6"
            style={{
              border: "var(--card-border-width) solid",
              padding: "var(--card-padding)",
              borderRadius: "var(--radius-card)",
              background: "var(--ds-surface)",
              borderColor: "color-mix(in srgb, var(--ds-accent) 45%, transparent)",
            }}
          >
            <div className="flex items-start gap-3">
              <CheckCircleIcon
                weight="duotone"
                className="size-5 shrink-0 mt-0.5"
                style={{ color: "var(--ds-accent)" }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="m-0 font-semibold">Deine Angaben stehen bereit.</p>
                <p className="m-0 mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>
                  Die Überweisung unten trägt jetzt deine Referenz. Sobald das Geld da ist,
                  erscheinst du auf der Seite.
                </p>
                <button
                  type="button"
                  onClick={forgetIssuedSponsorship}
                  className={`${buttonBaseClass} mt-3 border`}
                  style={{
                    borderColor: "var(--ds-btn-neutral-border)",
                    color: "var(--ds-btn-neutral-text)",
                  }}
                >
                  Angaben ändern
                </button>
              </div>
            </div>
          </div>
        ) : (
          <SponsorForm onIssued={keepIssued} />
        ))}

      {bankAccount && variant && (
        <div
          className="lmaa-card lmaa-payment-card mt-6"
          style={{
            border: "var(--card-border-width) solid",
            padding: "var(--card-padding)",
            borderRadius: "var(--radius-card)",
            background: "var(--ds-surface)",
            borderColor: variant.recommended
              ? "color-mix(in srgb, var(--ds-accent) 45%, transparent)"
              : "var(--ds-border-subtle)",
          }}
        >
          <div className="lmaa-card-head flex items-start justify-between gap-4">
            <h3
              className="font-semibold"
              style={{
                fontFamily: "var(--ds-font-serif)",
                fontSize: "var(--ds-text-lg)",
                lineHeight: "var(--ds-leading-lg)",
              }}
            >
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
                className="lmaa-qr shrink-0 box-border"
                style={{
                  // The quiet zone belongs to the block: it takes its own space
                  // in the layout rather than being painted over what stands
                  // beside it. `size` stays the edge length of the code itself.
                  width: qrSize + qrMargin * 2,
                  height: qrSize + qrMargin * 2,
                  padding: qrMargin,
                  background: qrBackground,
                }}
              />
            )}

            {/* The figures and the notice about them form the column beside the
                code, so the notice starts where they start rather than under
                the code as well. */}
            <div className="flex min-w-[16rem] flex-1 flex-col">
              <dl
                // A list of five short figures, so it is set tight: the rows
                // belong together and reading them as one block is the point.
                className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-0.5 text-base content-start"
                style={{ lineHeight: "var(--ds-leading-lg)" }}
              >
                <dt style={TRANSFER_LABEL_STYLE}>{text.fieldName}</dt>
                <dd className={TRANSFER_VALUE_CLASS}>{bankAccount.beneficiaryName}</dd>
                <dt style={TRANSFER_LABEL_STYLE}>{text.fieldIban}</dt>
                <dd className={`${TRANSFER_VALUE_CLASS} break-all`}>
                  {groupIban(bankAccount.iban)}
                </dd>
                {bankAccount.bic && (
                  <>
                    <dt style={TRANSFER_LABEL_STYLE}>{text.fieldBic}</dt>
                    <dd className={TRANSFER_VALUE_CLASS}>{bankAccount.bic}</dd>
                  </>
                )}
                {remittance && (
                  <>
                    <dt style={TRANSFER_LABEL_STYLE}>{text.fieldPurpose}</dt>
                    <dd className={TRANSFER_VALUE_CLASS}>{remittance}</dd>
                  </>
                )}
                {creditorReference && issued && (
                  <>
                    <dt style={TRANSFER_LABEL_STYLE}>{text.fieldReference}</dt>
                    <dd className={TRANSFER_VALUE_CLASS}>{issued.referenceFormatted}</dd>
                  </>
                )}
                <dt style={TRANSFER_LABEL_STYLE}>{text.fieldAmount}</dt>
                <dd className={TRANSFER_VALUE_CLASS}>
                  {amountEur > 0 ? EURO_EXACT.format(amountEur) : text.amountOpen}
                  {interval.key === "monthly" && amountEur > 0 ? ` ${text.perMonth}` : ""}
                </dd>
              </dl>

              {variant.info && <InfoCard text={variant.info} />}
            </div>
          </div>
        </div>
      )}

      {/* The document decides the order. PayPal.Me pays once, so it stands
          under the single payment only; Sponsors carries a subscription and
          therefore stands under both. A sponsorship goes by transfer alone, so
          that tab shows neither: the name on the statement is what the year is
          recorded against, and a third party's payment does not carry it. */}
      {routes.flatMap((route) =>
        shownKey !== "sponsor" && (route.token !== "paypalme" || shownKey === "once")
          ? [<OutboundRoute key={`${route.token}-${route.url}`} route={route} />]
          : [],
      )}
      </div>
    </section>
  );
}
