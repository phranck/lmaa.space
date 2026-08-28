import { MoonStarsIcon, SunIcon } from "@phosphor-icons/react";

import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";

/** Which colour scheme a rendered document is shown in. */
export type ColorScheme = "light" | "dark";

const OPTIONS = [
  { value: "light" as const, icon: <SunIcon weight="duotone" className="w-3.5 h-3.5" /> },
  { value: "dark" as const, icon: <MoonStarsIcon weight="duotone" className="w-3.5 h-3.5" /> },
] as const;

interface ColorSchemeSegmentedControlProps {
  value: ColorScheme;
  onChange: (scheme: ColorScheme) => void;
}

/**
 * Switches what a preview is rendered in, light or dark.
 *
 * @param props - The scheme in force and the handler that changes it.
 * @returns The segmented control.
 *
 * @remarks
 * This is about the document being previewed rather than about the dashboard,
 * which is dark and offers no choice. An email arrives in whichever scheme the
 * reader's mail client asks for, so both have to be checkable.
 */
export function ColorSchemeSegmentedControl({ value, onChange }: ColorSchemeSegmentedControlProps) {
  return <SegmentedControl value={value} onChange={onChange} options={OPTIONS} />;
}
