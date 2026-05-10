import type { ReactNode } from "react";

import { DashboardSegmentedControl } from "@/components/ui/DashboardControls.tsx";

interface SegmentSwitchOption<T extends string> {
  disabled?: boolean;
  icon?: ReactNode;
  label: ReactNode;
  value: T;
}

interface SegmentSwitchProps<T extends string> {
  className?: string;
  onChange: (value: T) => void;
  options: readonly SegmentSwitchOption<T>[];
  size?: "sm" | "md";
  value: T;
}

const sizeMap = {
  sm: "compact",
  md: "large",
} as const;

export function SegmentSwitch<T extends string>({
  className,
  onChange,
  options,
  size = "sm",
  value,
}: SegmentSwitchProps<T>) {
  return (
    <DashboardSegmentedControl
      className={className}
      onValueChange={onChange}
      options={options}
      size={sizeMap[size]}
      value={value}
      variant="outline"
    />
  );
}
