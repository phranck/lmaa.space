import { normalizePaymentMethods, type PaymentMethodKey } from "@lmaa/shared";

import { MultiSelect, type MultiSelectMessages } from "./MultiSelect.tsx";
import { getSelectablePaymentMethods } from "./payment-method-selection.ts";
import type { PaymentMethodLocale } from "./payment-methods.ts";

export interface PaymentMethodsEditorMessages extends MultiSelectMessages {
  placeholder: string;
  locale?: PaymentMethodLocale;
  labels?: Partial<Record<PaymentMethodKey, string>>;
}

export interface PaymentMethodsEditorProps {
  value: PaymentMethodKey[];
  onChange: (value: PaymentMethodKey[]) => void;
  messages: PaymentMethodsEditorMessages;
  error?: string;
}

/** Canonical icon-backed payment method selector for shop editing workflows. */
export function PaymentMethodsEditor({
  value,
  onChange,
  messages,
  error,
}: PaymentMethodsEditorProps) {
  const selectablePaymentMethods = getSelectablePaymentMethods(value);

  return (
    <MultiSelect
      options={selectablePaymentMethods.map((method) => ({
        value: method.key,
        label: messages.labels?.[method.key] ?? method.labels[messages.locale ?? "de"],
        icon: method.icon,
      }))}
      value={value}
      onValueChange={(nextValue) => onChange(normalizePaymentMethods(nextValue))}
      messages={messages}
      placeholder={messages.placeholder}
      maxCount={3}
      error={error}
    />
  );
}
