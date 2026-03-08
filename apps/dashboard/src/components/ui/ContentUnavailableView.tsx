import type React from "react";

interface ContentUnavailableViewProps {
  /** SF Symbol or any icon node — caller controls size and color. */
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  className?: string;
}

/**
 * Centered empty-state view with icon, title and optional subtitle.
 *
 * Mirrors the iOS `ContentUnavailableView` pattern.
 * Always has `p-6` minimum padding on all sides. Pass `className` to set a fixed height.
 *
 * @returns Empty state view.
 */
export function ContentUnavailableView({
  icon,
  title,
  subtitle,
  className,
}: ContentUnavailableViewProps) {
  return (
    <div
      className={[
        "grid w-full h-full min-h-80 place-items-center self-stretch p-6 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col items-center justify-center gap-3">
        <span className="text-[var(--ds-text-muted)] [&_svg]:w-12 [&_svg]:h-12">{icon}</span>
        <div className="space-y-1">
          <p className="text-base font-bold text-[var(--ds-text)]">{title}</p>
          <p className="text-xs text-[var(--ds-text-muted)] max-w-[240px] mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
