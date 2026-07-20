import { BankIcon, CreditCardIcon, ReceiptIcon } from "@phosphor-icons/react";
import type { ComponentType } from "react";
import {
  SiAmazonpay,
  SiAmericanexpress,
  SiApplepay,
  SiGooglepay,
  SiKlarna,
  SiMastercard,
  SiPaypal,
  SiSepa,
  SiStripe,
  SiVisa,
} from "react-icons/si";

import { PAYMENT_METHOD_KEYS, type PaymentMethodKey } from "@lmaa/shared";

export type PaymentMethodLocale = "de" | "en";

export interface PaymentMethodDef {
  key: PaymentMethodKey;
  labels: Record<PaymentMethodLocale, string>;
  icon: ComponentType<{ className?: string; size?: number; "aria-hidden"?: boolean }>;
  opticalScale: number;
}

const PAYMENT_METHOD_METADATA: Record<PaymentMethodKey, Omit<PaymentMethodDef, "key">> = {
  paypal: { labels: { de: "PayPal", en: "PayPal" }, icon: SiPaypal, opticalScale: 0.68 },
  credit_card: {
    labels: { de: "Kreditkarte", en: "Credit card" },
    icon: CreditCardIcon,
    opticalScale: 0.76,
  },
  stripe: { labels: { de: "Stripe", en: "Stripe" }, icon: SiStripe, opticalScale: 0.64 },
  sepa: {
    labels: { de: "SEPA-Lastschrift", en: "SEPA direct debit" },
    icon: SiSepa,
    opticalScale: 1,
  },
  bank_transfer: {
    labels: { de: "Überweisung", en: "Bank transfer" },
    icon: BankIcon,
    opticalScale: 0.76,
  },
  invoice: { labels: { de: "Rechnung", en: "Invoice" }, icon: ReceiptIcon, opticalScale: 0.76 },
  klarna: { labels: { de: "Klarna", en: "Klarna" }, icon: SiKlarna, opticalScale: 0.68 },
  apple_pay: { labels: { de: "Apple Pay", en: "Apple Pay" }, icon: SiApplepay, opticalScale: 1 },
  google_pay: {
    labels: { de: "Google Pay", en: "Google Pay" },
    icon: SiGooglepay,
    opticalScale: 1,
  },
  amazon_pay: {
    labels: { de: "Amazon Pay", en: "Amazon Pay" },
    icon: SiAmazonpay,
    opticalScale: 1,
  },
  visa: { labels: { de: "Visa", en: "Visa" }, icon: SiVisa, opticalScale: 1 },
  mastercard: {
    labels: { de: "Mastercard", en: "Mastercard" },
    icon: SiMastercard,
    opticalScale: 0.9,
  },
  american_express: {
    labels: { de: "American Express", en: "American Express" },
    icon: SiAmericanexpress,
    opticalScale: 0.86,
  },
};

export const PAYMENT_METHODS: PaymentMethodDef[] = PAYMENT_METHOD_KEYS.map((key) => ({
  key,
  ...PAYMENT_METHOD_METADATA[key],
}));

export const PAYMENT_METHOD_MAP: ReadonlyMap<PaymentMethodKey, PaymentMethodDef> = new Map(
  PAYMENT_METHODS.map((method) => [method.key, method]),
);

export const PAYMENT_METHOD_DISPLAY_ORDER: readonly PaymentMethodKey[] = [
  "paypal",
  "credit_card",
  "visa",
  "mastercard",
  "american_express",
  "stripe",
  "klarna",
  "apple_pay",
  "google_pay",
  "amazon_pay",
  "sepa",
  "invoice",
  "bank_transfer",
];

export const PAYMENT_METHOD_DISPLAY_PRIORITY = new Map(
  PAYMENT_METHOD_DISPLAY_ORDER.map((method, index) => [method, index]),
);

export function getPaymentMethodLabel(
  method: PaymentMethodKey,
  locale: PaymentMethodLocale,
): string {
  return PAYMENT_METHOD_METADATA[method].labels[locale];
}
