import { getButtonIconComponent, type ButtonIconComponent } from "@lmaa/ui";

type ButtonIconProps = {
  className?: string;
  width?: number | string;
  height?: number | string;
  size?: number | string;
  title?: string;
  "aria-hidden"?: boolean;
};

interface LazyButtonIconProps extends ButtonIconProps {
  name: string;
}

export default function LazyButtonIcon({ name, ...props }: LazyButtonIconProps) {
  const Icon: ButtonIconComponent | null = getButtonIconComponent(name);

  if (!Icon) {
    return null;
  }

  return <Icon {...props} />;
}
