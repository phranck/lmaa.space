import { createElement } from "react";
import type { ElementType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import * as ui from "@lmaa/ui";

describe("PaymentMethodsEditor", () => {
  it("hides the generic credit-card option when a concrete network is selected", () => {
    const getSelectablePaymentMethods = (ui as Record<string, unknown>)
      .getSelectablePaymentMethods as ((value: string[]) => Array<{ key: string }>) | undefined;

    expect(getSelectablePaymentMethods).toBeTypeOf("function");
    expect(getSelectablePaymentMethods?.(["visa"]).map((method) => method.key)).not.toContain(
      "credit_card",
    );
    expect(getSelectablePaymentMethods?.([]).map((method) => method.key)).toContain("credit_card");
  });

  it("renders selected payment methods with their localized labels", () => {
    const PaymentMethodsEditor = (ui as Record<string, unknown>).PaymentMethodsEditor as
      | ElementType
      | undefined;

    expect(PaymentMethodsEditor).toBeTypeOf("function");

    const markup = renderToStaticMarkup(
      createElement(PaymentMethodsEditor!, {
        value: ["paypal", "visa"],
        onChange: () => undefined,
        messages: {
          placeholder: "Zahlungsarten wählen…",
          selectAll: "(Alle auswählen)",
          clearAllAriaLabel: "Alle entfernen",
          clearSelectionAriaLabel: "Zahlungsart entfernen",
          moreSelected: (count: number) => `+ ${count} weitere`,
          searchPlaceholder: "Suchen…",
          labels: {
            paypal: "PayPal",
            visa: "Visa",
          },
        },
      }),
    );

    expect(markup).toContain("PayPal");
    expect(markup).toContain("Visa");
  });

  it("renders icon-only payment methods at an explicit size with tooltips", () => {
    const PaymentMethodIcons = (ui as Record<string, unknown>).PaymentMethodIcons as
      | ElementType
      | undefined;

    expect(PaymentMethodIcons).toBeTypeOf("function");

    const markup = renderToStaticMarkup(
      createElement(PaymentMethodIcons!, {
        methods: ["invoice", "visa", "paypal"],
        locale: "de",
        showLabels: false,
        iconSize: 42,
      }),
    );

    expect(markup).toContain('title="PayPal"');
    expect(markup).toContain('style="width:42px;height:42px"');
    expect(markup).toMatch(/title="PayPal"[\s\S]*?width="29"/);
    expect(markup).toMatch(/title="Visa"[\s\S]*?width="42"/);
    expect(markup).not.toContain(">PayPal</span>");
    expect(markup.indexOf('title="PayPal"')).toBeLessThan(markup.indexOf('title="Visa"'));
    expect(markup.indexOf('title="Visa"')).toBeLessThan(markup.indexOf('title="Rechnung"'));
  });
});
