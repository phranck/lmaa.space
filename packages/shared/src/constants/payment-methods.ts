/** Canonical payment method keys persisted by shops and submissions. */
export const PAYMENT_METHOD_KEYS = [
  "paypal",
  "credit_card",
  "stripe",
  "sepa",
  "bank_transfer",
  "invoice",
  "klarna",
  "apple_pay",
  "google_pay",
  "amazon_pay",
  "visa",
  "mastercard",
  "american_express",
] as const;

export type PaymentMethodKey = (typeof PAYMENT_METHOD_KEYS)[number];

const PAYMENT_METHOD_ALIASES: Readonly<Record<string, PaymentMethodKey>> = {
  paypal: "paypal",
  "pay pal": "paypal",
  credit_card: "credit_card",
  "credit-card": "credit_card",
  "credit card": "credit_card",
  card: "credit_card",
  cards: "credit_card",
  kreditkarte: "credit_card",
  kreditkarten: "credit_card",
  stripe: "stripe",
  sepa: "sepa",
  "sepa direct debit": "sepa",
  "sepa-direct-debit": "sepa",
  sepa_lastschrift: "sepa",
  "sepa lastschrift": "sepa",
  "direct debit": "sepa",
  lastschrift: "sepa",
  bank_transfer: "bank_transfer",
  "bank-transfer": "bank_transfer",
  "bank transfer": "bank_transfer",
  ueberweisung: "bank_transfer",
  überweisung: "bank_transfer",
  vorkasse: "bank_transfer",
  invoice: "invoice",
  rechnung: "invoice",
  "purchase on account": "invoice",
  klarna: "klarna",
  apple_pay: "apple_pay",
  "apple-pay": "apple_pay",
  "apple pay": "apple_pay",
  google_pay: "google_pay",
  "google-pay": "google_pay",
  "google pay": "google_pay",
  amazon_pay: "amazon_pay",
  "amazon-pay": "amazon_pay",
  "amazon pay": "amazon_pay",
  visa: "visa",
  mastercard: "mastercard",
  "master card": "mastercard",
  american_express: "american_express",
  "american-express": "american_express",
  "american express": "american_express",
  amex: "american_express",
};

const CARD_NETWORKS = new Set<PaymentMethodKey>(["visa", "mastercard", "american_express"]);

/** Normalizes untrusted payment method input to stable, deduplicated database keys. */
export function normalizePaymentMethods(value: unknown): PaymentMethodKey[] {
  if (!Array.isArray(value)) return [];

  const normalized = value.flatMap((entry) => {
    if (typeof entry !== "string") return [];
    const key = PAYMENT_METHOD_ALIASES[entry.trim().toLowerCase()];
    return key ? [key] : [];
  });
  const unique = [...new Set(normalized)];

  if (unique.some((method) => CARD_NETWORKS.has(method))) {
    return unique.filter((method) => method !== "credit_card");
  }

  return unique;
}
