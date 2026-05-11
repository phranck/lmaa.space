import {
  ButtonPrimitive,
  IconButtonPrimitive,
  type ButtonPrimitiveProps,
  type ButtonPrimitiveSize,
  type ButtonPrimitiveVariant,
  type IconButtonPrimitiveProps,
} from "@lmaa/ui/button-primitives";

export type DashboardButtonVariant = ButtonPrimitiveVariant | "review";
export type DashboardButtonSize = ButtonPrimitiveSize;

export interface DashboardButtonProps extends Omit<ButtonPrimitiveProps, "size" | "variant"> {
  size?: DashboardButtonSize;
  variant?: DashboardButtonVariant;
}

export type DashboardIconButtonProps = Omit<IconButtonPrimitiveProps, "size" | "variant"> & {
  size?: DashboardButtonSize;
  variant?: DashboardButtonVariant;
};

const dashboardButtonVariantClass: Partial<Record<DashboardButtonVariant, string>> = {
  review:
    "border-[var(--ds-badge-review-text)]/30 text-[var(--ds-badge-review-text)] hover:border-[var(--ds-badge-review-text)]/50 hover:bg-[var(--ds-badge-review-bg)]",
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function resolvePrimitiveVariant(variant: DashboardButtonVariant): ButtonPrimitiveVariant {
  return variant === "review" ? "neutral" : variant;
}

export function DashboardButton({
  className,
  size = "action",
  variant = "neutral",
  ...props
}: DashboardButtonProps) {
  return (
    <ButtonPrimitive
      className={cx(dashboardButtonVariantClass[variant], className)}
      size={size}
      variant={resolvePrimitiveVariant(variant)}
      {...props}
    />
  );
}

export function DashboardIconButton({
  className,
  size = "action",
  variant = "ghost",
  ...props
}: DashboardIconButtonProps) {
  const primitiveProps = {
    ...props,
    className: cx(dashboardButtonVariantClass[variant], className),
    size,
    variant: resolvePrimitiveVariant(variant),
  } as IconButtonPrimitiveProps;

  return <IconButtonPrimitive {...primitiveProps} />;
}
