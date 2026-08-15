import { logger } from "../../lib/logger.js";
import { readPaymentMethodsFromHtml } from "../../lib/payment-methods-from-html.js";
import type { PaymentMethodEvidence } from "../../lib/payment-methods-from-html.js";

/**
 * Largest page that is read.
 *
 * @remarks
 * Only the markup is scanned and a short list comes out, so the page never
 * reaches the provider. The ceiling stops one oversized page from occupying the
 * worker.
 */
const MAX_PAGE_BYTES = 2_000_000;

/** How long the shop has to answer before the evidence is given up on. */
const FETCH_TIMEOUT_MS = 20_000;

/**
 * Reads the payment methods a shop's own page evidences.
 *
 * @param shopUrl - The shop under review.
 * @returns The canonical keys and the labels they came from, empty when the
 * page is unreachable or names none.
 *
 * @remarks
 * Done here rather than by the model for two reasons. Shops draw their payment
 * methods as icons, so the names live in the markup and the provider's page
 * fetch, which returns extracted text, finds nothing; and a check that reads
 * this itself needs one request fewer, in a loop where every request re-reads
 * everything before it.
 *
 * Only the shop's own host is read, and the final destination is checked again
 * after any redirect, because a shop that redirects to a marketplace must not
 * turn this into a fetch of somebody else's page.
 */
export async function collectPaymentEvidence(shopUrl: string): Promise<PaymentMethodEvidence> {
  const empty: PaymentMethodEvidence = { methods: [], labels: [] };

  let target: URL;
  try {
    target = new URL(shopUrl);
  } catch {
    return empty;
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") return empty;

  try {
    const response = await fetch(target, {
      headers: { accept: "text/html" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) return empty;
    if (!sameSite(new URL(response.url), target)) return empty;

    const html = (await response.text()).slice(0, MAX_PAGE_BYTES);
    return readPaymentMethodsFromHtml(html);
  } catch (error) {
    logger.warn({ err: error, host: target.hostname }, "payment evidence could not be read");
    return empty;
  }
}

function sameSite(actual: URL, expected: URL): boolean {
  const strip = (host: string) => host.replace(/^www\./, "");
  return strip(actual.hostname) === strip(expected.hostname);
}
