import { useLayoutEffect, useRef, useState } from "react";

interface SegmentOption<T extends string> {
  value: T;
  label?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  size?: "sm" | "md";
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: SegmentedControlProps<T>) {
  const activeIndex = options.findIndex((o) => o.value === value);

  // Detect display mode
  const hasIcons = options.some((o) => o.icon);
  const hasLabels = options.some((o) => o.label);
  const iconOnly = hasIcons && !hasLabels;

  // Pill position tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number; height: number } | null>(null);
  const didMount = useRef(false);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>("button");
    const btn = buttons[activeIndex];
    if (!btn) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    setPill({ left: bRect.left - cRect.left, width: bRect.width, height: bRect.height });
    didMount.current = true;
  }, [activeIndex]);

  // Button size classes
  const btnPad = iconOnly
    ? size === "sm" ? "w-7 h-7" : "w-9 h-9"
    : size === "sm" ? "px-2.5 py-1" : "px-3.5 py-2";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      ref={containerRef}
      className="relative flex items-center bg-[var(--ds-segment-bg)] rounded-2xl p-1"
    >
      {/* Sliding pill indicator */}
      {pill && (
        <div
          aria-hidden="true"
          className="absolute rounded-xl bg-[var(--ds-segment-active-bg)] shadow-sm pointer-events-none"
          style={{
            left: pill.left,
            width: pill.width,
            height: pill.height,
            top: "50%",
            transform: "translateY(-50%)",
            transition: didMount.current
              ? "left 200ms cubic-bezier(0.4, 0, 0.2, 1), width 200ms cubic-bezier(0.4, 0, 0.2, 1)"
              : "none",
          }}
        />
      )}

      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            title={iconOnly ? (opt.label ?? String(opt.value)) : undefined}
            className={[
              "relative z-10 flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors",
              btnPad,
              textSize,
              isActive
                ? "text-[var(--ds-text)]"
                : "text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)]",
            ].join(" ")}
          >
            {opt.icon}
            {hasLabels && opt.label && <span>{opt.label}</span>}
            {opt.badge}
          </button>
        );
      })}
    </div>
  );
}
