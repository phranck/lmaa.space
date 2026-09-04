import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import type * as React from "react";
import { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";

import type { PendingSponsorshipReceipt } from "@lmaa/contracts";
import {
  buildEpcQrPayload,
  EURO_SYMBOL,
  formatEuro,
  formatEuroWhole,
  SUPPORT_LADDER_LABEL_DEFAULTS,
  type SupportLadderLabelKey,
} from "@lmaa/shared";
import { PAYMENT_METHOD_MAP } from "@lmaa/ui";

import SponsorForm from "@/components/islands/SponsorForm";
import { NoticeCard } from "@/components/NoticeCard";
import { normalizeAmountInput, readAmountInput } from "@/lib/amount-input";
import type {
  SupportLadderBankAccount,
  SupportLadderInterval,
  SupportLadderRoute,
} from "@/lib/content-shortcode-segments";
import { buttonBaseClass } from "@/lib/form-styles";
import {
  type AnnouncedSponsorship,
  getIssuedSponsorship,
  getServerIssuedSponsorship,
  rememberIssuedSponsorship,
  subscribeIssuedSponsorship,
} from "@/lib/pending-sponsorship-store";
import {
  CHOOSE_SUPPORT_INTERVAL_EVENT,
  type ChooseSupportIntervalDetail,
} from "@/lib/support-ladder-events";
import { initialSupportLadderState, supportLadderReducer } from "@/lib/support-ladder-state";

import { AmountGrid, RichText } from "./SupportLadderAmounts.tsx";
import {
  fitSvgToDrawing,
  OutboundRoute,
  RouteIcon,
  TRIM_ATTEMPTS,
} from "./SupportLadderRoutes.tsx";
import { TransferCard } from "./SupportLadderTransfer.tsx";

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
  /**
   * Who is paid, from the sponsoring settings rather than from the page.
   *
   * One place holds it, so the transfer card, the code and any sentence naming
   * the account cannot disagree about where the money goes. Without a name and
   * an account there is nothing to pay into, and no transfer block is shown.
   */
  payee: { name: string; iban: string; bic: string };
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
 * The reference line before there is a reference.
 *
 * Five groups of four, which is what a finished one measures, so the row keeps
 * its width and nothing shifts when the real value arrives. It stands in the
 * card from the start rather than appearing later, because a line that is
 * visibly missing is what sends somebody to the form above it.
 */
const REFERENCE_MASK = "XXXX XXXX XXXX XXXX XXXX";

/**
 * Notes the reference the site has just issued, with the moment it happened.
 *
 * The moment is taken here rather than from the server, because what it decides
 * is when this browser stops showing the reference, and that is a decision
 * about this browser.
 */
function keepIssued(receipt: PendingSponsorshipReceipt, announced: AnnouncedSponsorship) {
  rememberIssuedSponsorship({ ...receipt, issuedAt: Date.now(), announced });
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
  payee,
  intervals,
  routes,
  labels,
  minSponsorAmountEur = 0,
}: SupportLadderProps) {
  // Merged once per render rather than looked up per label, and the defaults
  // are the only place the wording exists when the shortcode says nothing.
  const text = { ...SUPPORT_LADDER_LABEL_DEFAULTS, ...labels };

  // One state rather than four: choosing a tab moves the switch, and a moment
  // later the body, the amount and the field all follow together. The named
  // transitions are in `support-ladder-state.ts`, with their tests.
  const [state, dispatch] = useReducer(supportLadderReducer, undefined, () =>
    initialSupportLadderState(intervals, minSponsorAmountEur),
  );
  const { intervalKey, shownKey, amountEur, customAmount } = state;
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
  /**
   * Whether the form is open on an announcement that already exists.
   *
   * The reference is kept whilst it is: it may already stand in a banking app,
   * and a second one would leave that payment pointing at nothing.
   */
  const [correcting, setCorrecting] = useState(false);

  // A recurring payment is a standing order the payer sets up, so there is
  // nothing for a one-off transfer code to carry. A sponsorship is paid once
  // for the year, so it carries one like any other single transfer.
  // Nothing to pay into means nothing to show, whatever the page wrote about it.
  const hasPayee = payee.name !== "" && payee.iban !== "";
  const showQr = shownKey !== "monthly" && Boolean(bankAccount) && hasPayee;
  // A tab that draws no block of its own borrows the single payment's, because
  // that is the same transfer with a different reference.
  const onceVariant = bankAccount?.variants.find((entry) => entry.key === "once");
  const qrVariant = bankAccount?.variants.find((entry) => entry.key === shownKey) ?? onceVariant;
  // The code's appearance falls back on its own, so a tab may state a title and
  // a text of its own without having to restate every colour and size to keep
  // the code looking the way it does everywhere else.
  const qr = qrVariant?.qr ?? onceVariant?.qr;
  const qrSize = qr?.size ?? QR_DEFAULTS.size;
  const qrBackground = qr?.background ?? QR_DEFAULTS.background;
  const qrMargin = qr?.margin ?? QR_DEFAULTS.margin;

  /**
   * The wording of the form, when the tab in view carries one.
   *
   * Its presence is what decides whether this tab asks anything of the reader
   * at all, so the page says where the form belongs rather than the component
   * deciding it from a key.
   */
  const sponsorForm = qrVariant?.sponsorForm;

  /**
   * Whether what stands on the ladder buys a sponsorship at all.
   *
   * Below the floor the payment is a donation whatever was announced, so it is
   * this and not the tab that decides both the reference and the words on the
   * transfer.
   */
  const earnsSponsorship =
    Boolean(sponsorForm) && minSponsorAmountEur > 0 && amountEur >= minSponsorAmountEur;

  /**
   * The reference the transfer carries, once it has been earned and issued.
   *
   * It replaces the sentence rather than joining it: the code holds one of the
   * two and never both, and the reference is the half that survives the payer's
   * app and the banks in between.
   *
   * Lowering the amount takes it back out. A code that named a sponsorship
   * whilst carrying less than one costs would put an entry in front of the
   * operator that the money never earned.
   */
  const creditorReference = earnsSponsorship ? issued?.reference : undefined;
  const remittance = creditorReference
    ? undefined
    : (earnsSponsorship ? bankAccount?.purposeSponsor : undefined) || bankAccount?.purposeDonation;

  const payload = useMemo(() => {
    if (!showQr || !bankAccount) return null;
    try {
      return buildEpcQrPayload({
        beneficiaryName: payee.name,
        iban: payee.iban,
        bic: payee.bic,
        amountEur: amountEur > 0 ? amountEur : undefined,
        remittance,
        creditorReference,
      });
    } catch {
      // A malformed payee is a content mistake. The details stay readable as
      // text below, so the block degrades to something still usable.
      return null;
    }
  }, [showQr, bankAccount, payee, amountEur, remittance, creditorReference]);

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
    dispatch({ type: "choose-interval", key });

    if (swapTimer.current !== null) window.clearTimeout(swapTimer.current);
    swapTimer.current = window.setTimeout(() => {
      dispatch({
        type: "show-interval",
        key,
        interval: intervals.find((entry) => entry.key === key),
        floorEur: minSponsorAmountEur,
      });
      swapTimer.current = null;
    }, BODY_FADE_MS);
  }

  /**
   * Lets something outside the island open one of these tabs.
   *
   * The sponsor wall's invitation stands above this and cannot reach the state
   * in here. Sending somebody to a closed tab would ask them to find the step
   * again after they had already taken it, so the same click opens it.
   */
  useEffect(() => {
    function open(event: Event) {
      const key = (event as CustomEvent<ChooseSupportIntervalDetail>).detail?.key;
      if (!key || !intervals.some((entry) => entry.key === key)) return;
      chooseInterval(key);
    }

    window.addEventListener(CHOOSE_SUPPORT_INTERVAL_EVENT, open);
    return () => window.removeEventListener(CHOOSE_SUPPORT_INTERVAL_EVENT, open);
  });

  function chooseCustom(value: string) {
    // What the field holds is the cleaned value, so grouping separators, stray
    // characters, and a third decimal never survive a keystroke.
    const cleaned = normalizeAmountInput(value);

    dispatch({
      type: "enter-custom",
      cleaned,
      amountEur: cleaned === "" ? null : readAmountInput(cleaned),
      interval,
      floorEur: minSponsorAmountEur,
    });
  }

  if (!interval) return null;

  const variant = qrVariant;
  const yearlyTotal = amountEur * MONTHS_PER_YEAR;
  const intervalText = interval.text.replaceAll(
    YEARLY_TOTAL_PLACEHOLDER,
    formatEuroWhole(yearlyTotal),
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
        {/* One card for everything the sponsor tab asks, because choosing the
          amount, saying who you are, and being told the reference is ready are
          three steps of one errand rather than three separate offers. Every
          other tab keeps its cards apart, since its amounts are read against
          each other. */}
        {sponsorForm ? (
          <div
            className="lmaa-card lmaa-accent-wash mt-6 flex flex-col gap-4"
            style={{
              // No edge, and the shadow instead: this card is the one thing this
              // tab is for, and it is lit the same way the sponsor invitation is.
              padding: "var(--card-padding)",
              borderRadius: "var(--radius-card)",
              backgroundColor: "var(--ds-surface-form)",
              boxShadow: "var(--ds-shadow-md)",
            }}
          >
            <AmountGrid
              // A fresh tab starts without a complaint about the tab before it.
              key={shownKey}
              interval={interval}
              amountEur={amountEur}
              customAmount={customAmount}
              perMonthLabel={text.perMonth}
              onChoose={(next) => dispatch({ type: "choose-amount", amountEur: next })}
              onCustom={chooseCustom}
              minimumEur={minSponsorAmountEur}
              minimumNotice={(interval.belowMinimum ?? "").replaceAll(
                "{min}",
                formatEuroWhole(minSponsorAmountEur),
              )}
              bare
            />

            {issued && !correcting ? (
              <NoticeCard tone="success" title={sponsorForm.issuedTitle}>
                <p className="m-0 mt-1" style={{ color: "var(--ds-text-muted)" }}>
                  {sponsorForm.issuedText}
                </p>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCorrecting(true)}
                    className={`${buttonBaseClass} border`}
                    style={{
                      background: "var(--ds-surface)",
                      borderColor: "var(--ds-btn-neutral-border)",
                      color: "var(--ds-btn-neutral-text)",
                    }}
                  >
                    {sponsorForm.changeLabel}
                  </button>
                </div>
              </NoticeCard>
            ) : (
              <SponsorForm
                amountEur={amountEur}
                earnsSponsorship={earnsSponsorship}
                correcting={
                  issued ? { reference: issued.reference, announced: issued.announced } : undefined
                }
                labels={sponsorForm}
                onIssued={(receipt, announced) => {
                  keepIssued(receipt, announced);
                  setCorrecting(false);
                }}
              />
            )}

            {/* Last, because it is the thing to read once before acting rather
              than a step of its own. */}
            {interval.hint && <NoticeCard>{<RichText html={interval.hint} />}</NoticeCard>}
          </div>
        ) : (
          <div
            className={`mt-6 grid gap-3 ${
              interval.hint && interval.options.length === 0 ? "md:grid-cols-2" : ""
            }`}
          >
            {interval.hint && (
              <NoticeCard inset={interval.options.length === 0}>
                <RichText html={interval.hint} />
              </NoticeCard>
            )}

            <AmountGrid
              key={shownKey}
              interval={interval}
              amountEur={amountEur}
              customAmount={customAmount}
              perMonthLabel={text.perMonth}
              onChoose={(next) => dispatch({ type: "choose-amount", amountEur: next })}
              onCustom={chooseCustom}
              minimumEur={0}
              minimumNotice=""
            />
          </div>
        )}

        {bankAccount && variant && hasPayee && (
          <TransferCard
            bankAccount={bankAccount}
            variant={variant}
            payee={payee}
            amountEur={amountEur}
            intervalKey={interval.key}
            remittance={remittance}
            issued={issued}
            earnsSponsorship={earnsSponsorship}
            showQr={showQr && payload !== null}
            qr={{ ref: qrRef, size: qrSize, margin: qrMargin, background: qrBackground }}
            text={text}
          />
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
