import type { ComponentPropsWithoutRef } from "react";

import { SwitchPrimitive } from "./ChoicePrimitives.tsx";

export interface ToggleSwitchProps
  extends Omit<ComponentPropsWithoutRef<"button">, "onChange" | "onClick"> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled,
  ...buttonProps
}: ToggleSwitchProps) {
  return (
    <SwitchPrimitive
      {...buttonProps}
      checked={checked}
      disabled={disabled}
      onCheckedChange={onChange}
      size="sm"
    />
  );
}
