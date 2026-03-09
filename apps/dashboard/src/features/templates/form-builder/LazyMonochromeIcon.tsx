import type React from "react";
import * as MonochromeIcons from "sf-symbols-lib/monochrome";

type MonochromeIconProps = {
  className?: string;
  width?: number | string;
  height?: number | string;
  size?: number | string;
  title?: string;
  "aria-hidden"?: boolean;
};

type MonochromeIconComponent = React.ComponentType<MonochromeIconProps>;

function getMonochromeIcon(name: string): MonochromeIconComponent | null {
  const icon = MonochromeIcons[name as keyof typeof MonochromeIcons];
  return icon ? (icon as MonochromeIconComponent) : null;
}

interface LazyMonochromeIconProps extends MonochromeIconProps {
  name: string;
}

export function LazyMonochromeIcon({ name, ...props }: LazyMonochromeIconProps) {
  const Icon = getMonochromeIcon(name);

  if (!Icon) {
    return null;
  }

  return <Icon {...props} />;
}
