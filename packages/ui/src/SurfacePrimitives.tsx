import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "./classNames";

export type SurfacePrimitiveVariant = "section" | "panel" | "elevated" | "inset" | "transparent";

export type SurfacePrimitivePadding = "none" | "sm" | "md" | "lg";
export type SurfacePrimitiveRadius = "control" | "lg" | "xl" | "2xl";

export interface SurfacePrimitiveProps extends HTMLAttributes<HTMLDivElement> {
  padding?: SurfacePrimitivePadding;
  radius?: SurfacePrimitiveRadius;
  variant?: SurfacePrimitiveVariant;
}

const surfaceVariantClass: Record<SurfacePrimitiveVariant, string> = {
  elevated:
    "border border-[var(--ds-border)] bg-[var(--ds-bg-elevated,var(--ds-surface))] shadow-[var(--ds-overlay-shadow)]",
  inset: "border border-[var(--ds-border-subtle,var(--ds-border))] bg-[var(--ds-surface-inset)]",
  panel: "border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-sm",
  section: "bg-[var(--ds-section-body-bg)] shadow-sm",
  transparent: "bg-transparent",
};

const surfacePaddingClass: Record<SurfacePrimitivePadding, string> = {
  lg: "p-6",
  md: "p-4",
  none: "",
  sm: "p-3",
};

const surfaceRadiusClass: Record<SurfacePrimitiveRadius, string> = {
  "2xl": "rounded-2xl",
  control: "rounded-control",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

export function SurfacePrimitive({
  children,
  className,
  padding = "md",
  radius = "xl",
  variant = "panel",
  ...surfaceProps
}: SurfacePrimitiveProps) {
  return (
    <div
      className={cx(
        surfaceVariantClass[variant],
        surfacePaddingClass[padding],
        surfaceRadiusClass[radius],
        className,
      )}
      {...surfaceProps}
    >
      {children}
    </div>
  );
}

export type DialogFooterPrimitiveAlign = "start" | "end" | "between";
export type DialogFooterPrimitiveDensity = "compact" | "default";

export interface DialogFooterPrimitiveProps extends HTMLAttributes<HTMLDivElement> {
  align?: DialogFooterPrimitiveAlign;
  children: ReactNode;
  density?: DialogFooterPrimitiveDensity;
}

const dialogFooterAlignClass: Record<DialogFooterPrimitiveAlign, string> = {
  between: "justify-between",
  end: "justify-end",
  start: "justify-start",
};

const dialogFooterDensityClass: Record<DialogFooterPrimitiveDensity, string> = {
  compact: "px-5 py-3",
  default: "px-6 py-3",
};

export function DialogFooterPrimitive({
  align = "end",
  children,
  className,
  density = "default",
  ...footerProps
}: DialogFooterPrimitiveProps) {
  return (
    <div
      className={cx(
        "flex items-center gap-3 border-t border-[var(--ds-border)] bg-[var(--ds-surface-inset)]",
        dialogFooterAlignClass[align],
        dialogFooterDensityClass[density],
        className,
      )}
      {...footerProps}
    >
      {children}
    </div>
  );
}
