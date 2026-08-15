import { BankIcon } from "@phosphor-icons/react";
import { createElement, type ComponentType } from "react";

import { PAYMENT_METHOD_KEYS, type PaymentMethodKey } from "@lmaa/shared";

// The explicit `?url` suffix forces the bundler to resolve each SVG to a plain
// URL string. Without it, Astro's `astro:assets` returns an ImageMetadata object
// (a component in dev), which is not a valid `<img src>` value and gets dropped
// by React, leaving the icons blank. `?url` behaves identically in Astro (SSR)
// and Vite (the dashboard), so both consumers of @lmaa/ui render correctly.
import amazonPaySvg from "./assets/payment-methods/apm/amazon-pay.svg?url";
import klarnaSvg from "./assets/payment-methods/apm/klarna.svg?url";
import paypalSvg from "./assets/payment-methods/apm/paypal.svg?url";
import sepaSvg from "./assets/payment-methods/apm/sepa.svg?url";
import americanExpressSvg from "./assets/payment-methods/cards/american-express.svg?url";
import mastercardSvg from "./assets/payment-methods/cards/mastercard.svg?url";
import visaSvg from "./assets/payment-methods/cards/visa.svg?url";
import cardGenericSvg from "./assets/payment-methods/generic/card-generic.svg?url";
import invoiceSvg from "./assets/payment-methods/generic/invoice.svg?url";
import applePaySvg from "./assets/payment-methods/wallets/apple-pay.svg?url";
import googlePaySvg from "./assets/payment-methods/wallets/google-pay.svg?url";

export type PaymentMethodLocale = "de" | "en";

export interface PaymentMethodDef {
  key: PaymentMethodKey;
  labels: Record<PaymentMethodLocale, string>;
  icon: ComponentType<{ className?: string; size?: number; "aria-hidden"?: boolean }>;
}

interface PaymentMethodIconProps {
  className?: string;
  size?: number;
  "aria-hidden"?: boolean;
}

function createSvgIcon(assetUrl: string) {
  return function PaymentMethodIcon({ className = "", size = 16, "aria-hidden": ariaHidden = true }: PaymentMethodIconProps) {
    // All payment logos share a 3:2 (120x80) canvas with their own rounded card
    // background. Rendering the <img> at that ratio (not a square box) lets the
    // border and shadow hug the card itself. No `w-auto`/`h-auto`: those CSS
    // rules would override the width/height attributes and blow the logo up to
    // its intrinsic size.
    //
    // Resting state is a warm-toned monochrome (grayscale + a stone-hued duotone
    // via sepia/hue-rotate) with reduced contrast so cards of different brand
    // background lightness — white PayPal, dark Amazon, pink Klarna — read at a
    // uniform intensity. The hover filter keeps the same function list at neutral
    // values so `transition-all` interpolates smoothly to full colour, while the
    // card zooms slightly and the shadow deepens (the `group` lives on the
    // enclosing <li> in PaymentMethodIcons).
    const width = size;
    const height = Math.round((size * 2) / 3);
    return createElement("img", {
      src: assetUrl,
      alt: "",
      "aria-hidden": ariaHidden,
      width,
      height,
      className: [
        "rounded border border-black/10 object-contain shadow-sm transition-all duration-200",
        "[filter:grayscale(1)_contrast(0.5)_brightness(1.15)_sepia(0.3)_hue-rotate(-10deg)_saturate(1.1)]",
        "group-hover:scale-110 group-hover:shadow-md",
        "group-hover:[filter:grayscale(0)_contrast(1)_brightness(1)_sepia(0)_hue-rotate(0deg)_saturate(1)]",
        className,
      ]
        .filter(Boolean)
        .join(" "),
    });
  };
}

const PAYMENT_METHOD_METADATA: Record<PaymentMethodKey, Omit<PaymentMethodDef, "key">> = {
  paypal: { labels: { de: "PayPal", en: "PayPal" }, icon: createSvgIcon(paypalSvg) },
  credit_card: {
    labels: { de: "Kreditkarte", en: "Credit card" },
    icon: createSvgIcon(cardGenericSvg),
  },
  stripe: { labels: { de: "Stripe", en: "Stripe" }, icon: createSvgIcon(cardGenericSvg) },
  sepa: {
    labels: { de: "SEPA-Lastschrift", en: "SEPA direct debit" },
    icon: createSvgIcon(sepaSvg),
  },
  bank_transfer: {
    labels: { de: "Überweisung", en: "Bank transfer" },
    icon: BankIcon,
  },
  invoice: {
    labels: { de: "Rechnung", en: "Invoice" },
    icon: createSvgIcon(invoiceSvg),
  },
  klarna: { labels: { de: "Klarna", en: "Klarna" }, icon: createSvgIcon(klarnaSvg) },
  apple_pay: {
    labels: { de: "Apple Pay", en: "Apple Pay" },
    icon: createSvgIcon(applePaySvg),
  },
  google_pay: {
    labels: { de: "Google Pay", en: "Google Pay" },
    icon: createSvgIcon(googlePaySvg),
  },
  amazon_pay: {
    labels: { de: "Amazon Pay", en: "Amazon Pay" },
    icon: createSvgIcon(amazonPaySvg),
  },
  visa: { labels: { de: "Visa", en: "Visa" }, icon: createSvgIcon(visaSvg) },
  mastercard: {
    labels: { de: "Mastercard", en: "Mastercard" },
    icon: createSvgIcon(mastercardSvg),
  },
  // Both carry the generic card until their own logo is licensed and added,
  // which is the same placeholder Stripe uses.
  maestro: { labels: { de: "Maestro", en: "Maestro" }, icon: createSvgIcon(cardGenericSvg) },
  shop_pay: { labels: { de: "Shop Pay", en: "Shop Pay" }, icon: createSvgIcon(cardGenericSvg) },
  american_express: {
    labels: { de: "American Express", en: "American Express" },
    icon: createSvgIcon(americanExpressSvg),
  },
};

export const PAYMENT_METHODS: PaymentMethodDef[] = PAYMENT_METHOD_KEYS.map((key) => ({
  key,
  ...PAYMENT_METHOD_METADATA[key],
}));

export const PAYMENT_METHOD_MAP: ReadonlyMap<PaymentMethodKey, PaymentMethodDef> = new Map(
  PAYMENT_METHODS.map((method) => [method.key, method]),
);

const PAYMENT_METHOD_DISPLAY_ORDER: readonly PaymentMethodKey[] = [
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
