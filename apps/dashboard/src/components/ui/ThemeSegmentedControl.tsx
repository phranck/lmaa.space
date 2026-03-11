import { DesktopIcon, MoonStarsIcon, SunIcon } from "@phosphor-icons/react";

import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";

export type ThemeOption = "light" | "dark" | "system";

const ALL_OPTIONS = [
  { value: "light" as const, icon: <SunIcon weight="duotone" className="w-3.5 h-3.5" /> },
  { value: "dark" as const, icon: <MoonStarsIcon weight="duotone" className="w-3.5 h-3.5" /> },
  { value: "system" as const, icon: <DesktopIcon weight="duotone" className="w-3.5 h-3.5" /> },
] as const;

interface ThemeSegmentedControlProps {
  value: ThemeOption;
  onChange: (v: ThemeOption) => void;
  /** Subset of options to display. Defaults to all three. */
  options?: readonly ThemeOption[];
  storageKey?: string;
}

/**
 * Reusable theme segmented control using SF Symbol icons.
 * Used in the dashboard layout (light/dark/system) and in the email preview
 * panel (light/dark only).
 */
export function ThemeSegmentedControl({
  value,
  onChange,
  options,
  storageKey,
}: ThemeSegmentedControlProps) {
  const filtered = options ? ALL_OPTIONS.filter((o) => options.includes(o.value)) : ALL_OPTIONS;

  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={filtered}
      storageKey={storageKey}
    />
  );
}
