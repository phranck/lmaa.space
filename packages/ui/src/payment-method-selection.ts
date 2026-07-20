import type { PaymentMethodKey } from "@lmaa/shared";

import { PAYMENT_METHODS } from "./payment-methods.ts";

const CARD_NETWORKS = new Set<PaymentMethodKey>(["visa", "mastercard", "american_express"]);

export function getSelectablePaymentMethods(value: readonly PaymentMethodKey[]) {
  const hasConcreteCardNetwork = value.some((method) => CARD_NETWORKS.has(method));
  return hasConcreteCardNetwork
    ? PAYMENT_METHODS.filter((method) => method.key !== "credit_card")
    : PAYMENT_METHODS;
}
