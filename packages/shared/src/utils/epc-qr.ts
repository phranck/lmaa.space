/**
 * Builds the payload of an EPC QR code, the thing German and Austrian banking
 * apps call a GiroCode. Scanning one pre-fills a SEPA credit transfer, so the
 * payer never types an IBAN.
 *
 * The format is specified by the European Payments Council in EPC069-12. This
 * implementation follows version 3.1, issued 19 March 2024.
 *
 * Two properties of the format decide how it may be used, and both are
 * enforced here rather than left to the caller.
 *
 * The payload carries exactly one credit transfer. There is no field for an
 * interval, a mandate or a standing order, so a GiroCode cannot express a
 * recurring payment and no amount of encoding will make it one.
 *
 * The whole payload is limited to 331 bytes. Beyond that a scanner is not
 * required to read it, so {@link buildEpcQrPayload} refuses rather than
 * producing a code that fails in the payer's hand.
 */

/** Maximum payload size in bytes, per EPC069-12 v3.1. */
const MAX_PAYLOAD_BYTES = 331;

/** Field length limits, in characters, per EPC069-12 v3.1. */
const MAX_BENEFICIARY_NAME = 70;
const MAX_IBAN = 34;
const MAX_BIC = 11;
const MAX_REMITTANCE_UNSTRUCTURED = 140;

/** Amount bounds in euro, per EPC069-12 v3.1. */
const MIN_AMOUNT_EUR = 0.01;
const MAX_AMOUNT_EUR = 999999999.99;

/**
 * The details a GiroCode encodes.
 *
 * @property beneficiaryName - Account holder exactly as the bank holds it. The
 *   payer must not be asked to change it, so it is fixed in the code.
 * @property iban - Beneficiary IBAN, with or without spaces. Spaces are
 *   stripped before encoding because the format does not permit them.
 * @property bic - Beneficiary BIC. Optional inside the EEA since version 2 of
 *   the specification, and still required for non-EEA SEPA participants.
 * @property amountEur - Amount in euro. Omit it to let the payer decide in
 *   their banking app, which is what a free donation amount needs.
 * @property remittance - Unstructured remittance information, so the reference
 *   the payer sees on their statement.
 */
export interface EpcQrDetails {
  beneficiaryName: string;
  iban: string;
  bic?: string;
  amountEur?: number;
  remittance?: string;
}

/** Raised when the details cannot produce a payload a scanner will accept. */
export class EpcQrError extends Error {
  /** Stable code, so a caller can branch without matching on the message. */
  readonly code:
    | "beneficiary-name-missing"
    | "beneficiary-name-too-long"
    | "iban-invalid"
    | "bic-invalid"
    | "amount-out-of-range"
    | "remittance-too-long"
    | "payload-too-large";

  constructor(code: EpcQrError["code"], message: string) {
    super(message);
    this.name = "EpcQrError";
    this.code = code;
  }
}

/**
 * Formats an amount the way the specification requires, so `EUR` followed by
 * the value with a full stop as the decimal separator and no thousands
 * separator. Locale formatting must not be used here, because a German or
 * Austrian locale would emit a comma and the code would be rejected.
 */
function formatAmount(amountEur: number): string {
  return `EUR${amountEur.toFixed(2)}`;
}

/** Removes the spaces a person types into an IBAN and upper-cases it. */
function normalizeIban(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase();
}

/**
 * Builds the payload string for an EPC QR code.
 *
 * The result is fed straight to a QR encoder. It is not a URL and must not be
 * URL-encoded, wrapped or prefixed, because banking apps match on the leading
 * service tag.
 *
 * @param details - Who is paid, how much, and what for.
 * @returns The line-separated payload, ready to encode.
 * @throws {EpcQrError} When a field is missing, malformed, out of range, or
 *   when the finished payload exceeds the 331 byte limit.
 */
export function buildEpcQrPayload(details: EpcQrDetails): string {
  const beneficiaryName = details.beneficiaryName.trim();
  if (!beneficiaryName) {
    throw new EpcQrError("beneficiary-name-missing", "A beneficiary name is required.");
  }
  if (beneficiaryName.length > MAX_BENEFICIARY_NAME) {
    throw new EpcQrError(
      "beneficiary-name-too-long",
      `The beneficiary name may hold at most ${MAX_BENEFICIARY_NAME} characters.`,
    );
  }

  const iban = normalizeIban(details.iban);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(iban) || iban.length > MAX_IBAN) {
    throw new EpcQrError("iban-invalid", "The IBAN is not in a shape the format accepts.");
  }

  const bic = details.bic?.replace(/\s+/g, "").toUpperCase() ?? "";
  if (bic && (!/^[A-Z0-9]+$/.test(bic) || bic.length > MAX_BIC)) {
    throw new EpcQrError("bic-invalid", "The BIC is not in a shape the format accepts.");
  }

  if (details.amountEur !== undefined) {
    if (
      !Number.isFinite(details.amountEur) ||
      details.amountEur < MIN_AMOUNT_EUR ||
      details.amountEur > MAX_AMOUNT_EUR
    ) {
      throw new EpcQrError(
        "amount-out-of-range",
        `The amount must lie between ${MIN_AMOUNT_EUR} and ${MAX_AMOUNT_EUR} euro.`,
      );
    }
  }

  const remittance = details.remittance?.trim() ?? "";
  if (remittance.length > MAX_REMITTANCE_UNSTRUCTURED) {
    throw new EpcQrError(
      "remittance-too-long",
      `Remittance information may hold at most ${MAX_REMITTANCE_UNSTRUCTURED} characters.`,
    );
  }

  // Version 002 makes the BIC conditional rather than mandatory. Version 001
  // would require one, and a beneficiary inside the EEA need not supply it, so
  // 002 is emitted whether or not a BIC was passed.
  const lines = [
    "BCD",
    "002",
    "1", // UTF-8
    "SCT",
    bic,
    beneficiaryName,
    iban,
    details.amountEur === undefined ? "" : formatAmount(details.amountEur),
    "", // Purpose, unused
    "", // Structured remittance, mutually exclusive with the unstructured one
    remittance,
  ];

  // The specification forbids a trailing separator after the last populated
  // element, so empty trailing lines are dropped rather than emitted.
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  const payload = lines.join("\n");
  const byteLength = new TextEncoder().encode(payload).length;
  if (byteLength > MAX_PAYLOAD_BYTES) {
    throw new EpcQrError(
      "payload-too-large",
      `The payload is ${byteLength} bytes and may not exceed ${MAX_PAYLOAD_BYTES}.`,
    );
  }

  return payload;
}
