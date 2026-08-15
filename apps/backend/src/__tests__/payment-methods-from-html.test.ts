import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readPaymentMethodsFromHtml } from "../lib/payment-methods-from-html.js";

// The footer of a Shopify shop, as it is actually served. The names live in the
// SVG title and in the id it points at, and the provider's text extraction
// keeps neither, which is why the automation needs to read the markup itself.
const shopifyFooter = `
<div class="footer__payment-icons">
  <svg role="img" aria-labelledby="pi-american_express"><title id="pi-american_express">American Express</title></svg>
  <svg role="img" aria-labelledby="pi-apple_pay"><title id="pi-apple_pay">Apple Pay</title></svg>
  <svg role="img" aria-labelledby="pi-google_pay"><title id="pi-google_pay">Google Pay</title></svg>
  <svg role="img" aria-labelledby="pi-maestro"><title id="pi-maestro">Maestro</title></svg>
  <svg role="img" aria-labelledby="pi-master"><title id="pi-master">Mastercard</title></svg>
  <svg role="img" aria-labelledby="pi-paypal"><title id="pi-paypal">PayPal</title></svg>
  <svg role="img" aria-labelledby="pi-shopify_pay"><title id="pi-shopify_pay">Shop Pay</title></svg>
  <svg role="img" aria-labelledby="pi-visa"><title id="pi-visa">Visa</title></svg>
</div>`;

describe("readPaymentMethodsFromHtml", () => {
  it("reads what a Shopify footer draws as icons", () => {
    const evidence = readPaymentMethodsFromHtml(shopifyFooter);

    expect(evidence.methods.sort()).toEqual([
      "american_express",
      "apple_pay",
      "google_pay",
      "maestro",
      "mastercard",
      "paypal",
      "shop_pay",
      "visa",
    ]);
    expect(evidence.labels).toContain("American Express");
  });

  it("drops the generic card once a concrete network is evidenced", () => {
    const evidence = readPaymentMethodsFromHtml(
      `<img alt="Kreditkarte"><svg aria-labelledby="pi-visa"><title>Visa</title></svg>`,
    );

    expect(evidence.methods).toContain("visa");
    expect(evidence.methods).not.toContain("credit_card");
  });

  it("takes nothing from a page that names no payment method", () => {
    const evidence = readPaymentMethodsFromHtml(
      `<title>Über uns</title><img alt="Team beim Nähen"><h1>Willkommen</h1>`,
    );

    expect(evidence.methods).toEqual([]);
    expect(evidence.labels).toEqual([]);
  });

  it("reads the live page this was built for", () => {
    const fixture = path.resolve(import.meta.dirname, "fixtures/recolution-footer.html");
    const evidence = readPaymentMethodsFromHtml(readFileSync(fixture, "utf8"));

    expect(evidence.methods).toContain("paypal");
    expect(evidence.methods).toContain("american_express");
    expect(evidence.methods.length).toBeGreaterThanOrEqual(6);
  });
});
