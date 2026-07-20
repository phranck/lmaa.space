import type { PaymentMethodKey } from "@lmaa/shared";

import {
  PAYMENT_METHOD_DISPLAY_PRIORITY,
  PAYMENT_METHOD_MAP,
  type PaymentMethodLocale,
} from "./payment-methods.ts";

export interface PaymentMethodIconsProps {
  methods: PaymentMethodKey[];
  locale?: PaymentMethodLocale;
  className?: string;
  showLabels?: boolean;
  iconSize?: number;
}

/** Server-renderable payment method logos with accessible labels. */
export function PaymentMethodIcons({
  methods,
  locale = "de",
  className = "",
  showLabels = true,
  iconSize = 16,
}: PaymentMethodIconsProps) {
  const sortedMethods = methods
    .slice()
    .sort(
      (left, right) =>
        (PAYMENT_METHOD_DISPLAY_PRIORITY.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (PAYMENT_METHOD_DISPLAY_PRIORITY.get(right) ?? Number.MAX_SAFE_INTEGER),
    );

  return (
    <ul className={`m-0 flex list-none flex-wrap items-center gap-2 p-0 ${className}`.trim()}>
      {sortedMethods.flatMap((method) => {
        const definition = PAYMENT_METHOD_MAP.get(method);
        if (!definition) return [];
        const label = definition.labels[locale];
        const Icon = definition.icon;
        return (
          <li
            key={method}
            title={label}
            aria-label={label}
            className="group inline-flex min-w-0 cursor-help items-center gap-1.5"
          >
            <span
              className="inline-flex shrink-0 items-center justify-center"
              style={{ width: iconSize, height: iconSize }}
            >
              <Icon className="shrink-0" size={iconSize} aria-hidden />
            </span>
            {showLabels && <span>{label}</span>}
          </li>
        );
      })}
    </ul>
  );
}
