import { ArrowSquareOutIcon, CheckCircleIcon, InfoIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildEpcQrPayload,
  SUPPORT_LADDER_LABEL_DEFAULTS,
  type SupportLadderLabelKey,
} from "@lmaa/shared";

import type {
  SupportLadderBankAccount,
  SupportLadderInterval,
  SupportLadderPaypal,
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
 * @property labels - Wording overrides for everything outside the child nodes.
 *   Anything absent falls back to `SUPPORT_LADDER_LABEL_DEFAULTS`.
 */
interface SupportLadderProps {
  bankAccount?: SupportLadderBankAccount;
  intervals: SupportLadderInterval[];
  paypal?: SupportLadderPaypal;
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
  return (
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {interval.options.map((option, index) => {
        const active = !customAmount && option.amountEur === amountEur;
        return (
          <button
            // The position is part of the key, because an editor may write the
            // same amount twice and the amount alone would then collide.
            key={`${interval.key}-${index}-${option.amountEur}`}
            type="button"
            aria-pressed={active}
            onClick={() => onChoose(option.amountEur)}
            className="relative flex flex-col gap-1.5 p-6 text-left border transition-transform hover:-translate-y-0.5"
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
              <span className="text-sm" style={{ color: "var(--ds-text-muted)" }}>
                {option.description}
              </span>
            )}
            {/* A tick, so the chosen rung is not marked by colour alone. */}
            {active && (
              <CheckCircleIcon
                weight="fill"
                aria-hidden="true"
                className="absolute top-6 right-6 size-5"
                style={{ color: "var(--ds-accent)" }}
              />
            )}
          </button>
        );
      })}

      {interval.custom && (
        <label
          className="flex flex-col gap-1.5 p-6 border border-dashed"
          style={{ borderRadius: "var(--radius-card)", borderColor: "var(--ds-border)" }}
        >
          <span className="text-sm" style={{ color: "var(--ds-text-muted)" }}>
            {interval.custom.label}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={customAmount}
            placeholder={interval.custom.placeholder}
            aria-label={`${interval.custom.label} in Euro`}
            onChange={(event) => onCustom(event.target.value)}
            className="h-9 px-3 border rounded-control"
            style={{
              background: "var(--ds-surface)",
              borderColor: "var(--ds-border)",
              color: "var(--ds-text)",
            }}
          />
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
  paypal,
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
        width: qrSize,
        height: qrSize,
        data: payload,
        margin: qr?.margin ?? QR_DEFAULTS.margin,
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
        backgroundOptions: { color: qr?.background ?? QR_DEFAULTS.background },
        ...(qr?.image ? { image: qr.image } : {}),
      });

      node.replaceChildren();
      qrCode.append(node);
    });

    return () => {
      cancelled = true;
    };
  }, [payload, qr, qrSize]);

  function chooseInterval(key: SupportLadderInterval["key"]) {
    setIntervalKey(key);
    setCustomAmount("");
    setAmountEur(startingAmount(intervals.find((entry) => entry.key === key)));
  }

  function chooseCustom(value: string) {
    setCustomAmount(value);
    const parsed = Number.parseFloat(value.replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0) setAmountEur(parsed);
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
            <p className="mt-3 text-sm" style={{ color: "var(--ds-text-subtle)" }}>
              {intervalText}
            </p>
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
          className="mt-6 p-6 border"
          style={{
            borderRadius: "var(--radius-card)",
            background: "var(--ds-surface)",
            borderColor: variant.recommended
              ? "color-mix(in srgb, var(--ds-accent) 45%, transparent)"
              : "var(--ds-border-subtle)",
          }}
        >
          <h3 className="text-lg font-semibold" style={{ fontFamily: "var(--ds-font-serif)" }}>
            {variant.title}
          </h3>
          {variant.text && (
            <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>
              {variant.text}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-6">
            {showQr && payload && (
              <div
                ref={qrRef}
                aria-label={text.qrAlt}
                className="shrink-0 rounded-control overflow-hidden"
                style={{ width: qrSize, height: qrSize }}
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

          {/* The specification expects the encoded data to be readable beside
              the code, so the payer can check one against the other. */}
          {showQr && payload && (
            <p
              className="mt-4 flex items-start gap-2 text-sm"
              style={{ color: "var(--ds-text-subtle)" }}
            >
              <InfoIcon weight="duotone" aria-hidden="true" className="size-4 mt-0.5 shrink-0" />
              <span>{text.verifyNote}</span>
            </p>
          )}
        </div>
      )}

      {paypal && intervalKey === "once" && (
        <div
          className="mt-3 p-6 border"
          style={{
            borderRadius: "var(--radius-card)",
            background: "var(--ds-surface)",
            borderColor: "var(--ds-border-subtle)",
          }}
        >
          <h3 className="text-lg font-semibold" style={{ fontFamily: "var(--ds-font-serif)" }}>
            {paypal.title}
          </h3>
          {paypal.text && (
            <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>
              {paypal.text}
            </p>
          )}
          <a
            href={paypal.url}
            rel="noopener noreferrer"
            target="_blank"
            className="mt-6 inline-flex items-center gap-2 h-9 px-4 rounded-full border text-sm font-semibold"
            style={{ borderColor: "var(--ds-border)", color: "var(--ds-text)" }}
          >
            {paypal.button}
            <ArrowSquareOutIcon weight="duotone" aria-hidden="true" className="size-4" />
          </a>
        </div>
      )}
    </section>
  );
}
