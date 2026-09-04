import type * as React from "react";

import { EURO_SYMBOL, formatEuro, formatEuroWhole, groupIban } from "@lmaa/shared";

import { NoticeCard } from "@/components/NoticeCard";
import type {
  SupportLadderBankAccount,
  SupportLadderVariant,
} from "@/lib/content-shortcode-segments";

import { RichText } from "./SupportLadderAmounts.tsx";
import { RouteIcon } from "./SupportLadderRoutes.tsx";

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
 * What the transfer card says, taken from the ladder that owns the state.
 *
 * Grouped rather than passed one by one: the card reads a payee, a variant and
 * a handful of labels, and naming those three groups says more than fourteen
 * separate props would.
 */
export interface TransferCardProps {
  bankAccount: SupportLadderBankAccount;
  variant: SupportLadderVariant;
  payee: { name: string; iban: string; bic: string };
  /** The amount the transfer carries, in euro. */
  amountEur: number;
  /** The tab this card belongs to, which decides whether a month is named. */
  intervalKey: string;
  /** What the transfer's remittance line says. */
  remittance: string | undefined;
  /**
   * The reference this reader has been given, or `undefined` before one exists.
   *
   * The formatted form is what the card prints, because somebody is going to
   * type it into a banking app character by character.
   */
  issued: { referenceFormatted: string } | null;
  /** Whether this amount earns a sponsorship, which decides the reference line. */
  earnsSponsorship: boolean;
  /**
   * Whether a GiroCode is drawn beside the figures.
   *
   * The ladder answers this, because it is the one that built the payload and
   * knows whether there is anything to draw.
   */
  showQr: boolean;
  /**
   * The GiroCode, as the ladder resolved it against the page's defaults.
   *
   * The element is owned by the ladder because that is where the code is drawn
   * into it; the three figures decide the box it is drawn in.
   */
  qr: {
    ref: React.RefObject<HTMLDivElement | null>;
    /** Edge length of the code, in pixels. */
    size: number;
    /** Quiet zone around the code, in pixels, which the standard requires. */
    margin: number;
    /** What the quiet zone is painted in, so the code keeps its contrast. */
    background: string;
  };
  /** The wording, already merged with its defaults. */
  text: Record<string, string>;
}

/**
 * The account to pay into, with its GiroCode beside it.
 *
 * Lifted out of the island because it is one thing a reader looks at, and
 * because the island around it was carrying the whole donation interface.
 * It owns no state: everything it shows is decided by the ladder.
 */
export function TransferCard({
  bankAccount,
  variant,
  payee,
  amountEur,
  intervalKey,
  remittance,
  issued,
  earnsSponsorship,
  showQr,
  qr,
  text,
}: TransferCardProps) {
  return (
    <div
      className="lmaa-card lmaa-payment-card mt-6"
      style={
        {
          padding: "var(--card-padding)",
          borderRadius: "var(--radius-card)",
          backgroundColor: "var(--ds-surface)",
          "--payment-brand": variant.icon
            ? `var(--brand-${variant.icon}, transparent)`
            : "transparent",
        } as React.CSSProperties
      }
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
        {showQr && (
          <div
            ref={qr.ref}
            aria-label={text.qrAlt}
            className="lmaa-qr shrink-0 box-border"
            style={{
              // The quiet zone belongs to the block: it takes its own space
              // in the layout rather than being painted over what stands
              // beside it. `size` stays the edge length of the code itself.
              width: qr.size + qr.margin * 2,
              height: qr.size + qr.margin * 2,
              padding: qr.margin,
              background: qr.background,
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
            <dd className={TRANSFER_VALUE_CLASS}>{payee.name}</dd>
            <dt style={TRANSFER_LABEL_STYLE}>{text.fieldIban}</dt>
            <dd className={`${TRANSFER_VALUE_CLASS} break-all`}>{groupIban(payee.iban)}</dd>
            {payee.bic && (
              <>
                <dt style={TRANSFER_LABEL_STYLE}>{text.fieldBic}</dt>
                <dd className={TRANSFER_VALUE_CLASS}>{payee.bic}</dd>
              </>
            )}
            {remittance && (
              <>
                <dt style={TRANSFER_LABEL_STYLE}>{text.fieldPurpose}</dt>
                <dd className={TRANSFER_VALUE_CLASS}>{remittance}</dd>
              </>
            )}
            {/* Shown whilst the amount earns a sponsorship, whether or not
                one has been announced yet. Below the floor the transfer is
                an ordinary donation and has no reference to wait for. */}
            {earnsSponsorship && (
              <>
                <dt style={TRANSFER_LABEL_STYLE}>{text.fieldReference}</dt>
                <dd
                  className={TRANSFER_VALUE_CLASS}
                  style={issued ? undefined : { color: "var(--ds-danger-text)" }}
                  // The masked line is meaningless read out, so what it
                  // stands for is said instead.
                  aria-label={issued ? undefined : text.referenceMissing}
                >
                  {issued ? issued.referenceFormatted : REFERENCE_MASK}
                </dd>
              </>
            )}
            <dt style={TRANSFER_LABEL_STYLE}>{text.fieldAmount}</dt>
            <dd className={TRANSFER_VALUE_CLASS}>
              {amountEur > 0 ? formatEuro(amountEur) : text.amountOpen}
              {intervalKey === "monthly" && amountEur > 0 ? ` ${text.perMonth}` : ""}
            </dd>
          </dl>

          {variant.info && (
            <NoticeCard className="mt-4">
              <RichText html={variant.info} />
            </NoticeCard>
          )}
        </div>
      </div>
    </div>
  );
}
