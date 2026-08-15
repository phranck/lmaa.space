import { normalizePaymentMethods } from "@lmaa/shared";
import type { PaymentMethodKey } from "@lmaa/shared";

/**
 * What a page states about the payment methods it accepts.
 */
export interface PaymentMethodEvidence {
  /** The canonical keys, deduplicated and with the generic card dropped where a network is named. */
  methods: PaymentMethodKey[];
  /** The labels as the page wrote them, so a reviewer can check the finding. */
  labels: string[];
}

/**
 * Where a payment label hides in a page.
 *
 * @remarks
 * Shops draw their payment methods as icons, so the name is in the markup
 * rather than in the text. A shop built on Shopify writes it three times over:
 * as the `title` of the inline SVG, as the id it points at, and sometimes as
 * the `alt` of an image. The provider's page fetch returns extracted text, in
 * which none of that survives, which is why a run that read the page correctly
 * still reported that it could not evidence a single method.
 */
const LABEL_PATTERNS: RegExp[] = [
  /<title[^>]*>([^<]{2,40})<\/title>/gi,
  /aria-labelledby="pi-([a-z0-9_-]{2,40})"/gi,
  /<img[^>]+alt="([^"]{2,40})"[^>]*>/gi,
  /aria-label="([^"]{2,40})"/gi,
];

/**
 * Reads the payment methods a page evidences.
 *
 * @param html - The page as it was served, not extracted text.
 * @returns The canonical keys and the labels they came from.
 *
 * @remarks
 * Deliberately generous about where it looks and strict about what it accepts:
 * every candidate goes through `normalizePaymentMethods`, which only knows the
 * canonical keys and their spellings, so a heading, a document title or an
 * unrelated image alt contributes nothing.
 */
export function readPaymentMethodsFromHtml(html: string): PaymentMethodEvidence {
  const labels = new Set<string>();

  for (const pattern of LABEL_PATTERNS) {
    for (const match of html.matchAll(pattern)) {
      const raw = match[1]?.trim();
      if (raw) labels.add(raw.replace(/[_-]+/g, " "));
    }
  }

  const methods = normalizePaymentMethods([...labels]);
  const recognised = new Set(normalizePaymentMethods([...labels]));

  return {
    methods,
    labels: [...labels]
      .filter((label) => normalizePaymentMethods([label]).some((key) => recognised.has(key)))
      .sort(),
  };
}
