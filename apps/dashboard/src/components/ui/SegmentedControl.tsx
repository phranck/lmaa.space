import { useLayoutEffect, useRef, useState } from "react";

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly {
    value: T;
    label?: string;
    icon?: React.ReactNode;
    badge?: React.ReactNode;
  }[];
  size?: "sm" | "md";
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: SegmentedControlProps<T>) {
  const activeIndex = options.findIndex((o) => o.value === value);
  const isIconOnly = options.every((o) => o.icon && !o.label);

  const containerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number; height: number } | null>(null);
  const animate = useRef(false);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>("button");
    const btn = buttons[activeIndex];
    if (!btn) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    setPill({ left: bRect.left - cRect.left, width: bRect.width, height: bRect.height });
    // enable transition only after first measurement
    animate.current = true;
  }, [activeIndex]);

  const btnBase = isIconOnly
    ? `relative z-10 flex items-center justify-center ${size === "sm" ? "w-7 h-7" : "w-8 h-8"} rounded-md`
    : `relative z-10 flex items-center gap-2 ${size === "sm" ? "px-3 py-1" : "px-4 py-1.5"} rounded-md ${size === "sm" ? "text-xs" : "text-sm"} font-medium`;

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-0.5 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-segment-bg)] p-0.5"
    >
      {/* Sliding pill */}
      {pill && (
        <div
          aria-hidden="true"
          className="absolute rounded-md bg-[var(--ds-segment-active-bg)] shadow-sm pointer-events-none"
          style={{
            left: pill.left,
            width: pill.width,
            height: pill.height,
            top: "50%",
            transform: "translateY(-50%)",
            transition: animate.current
              ? "left 180ms cubic-bezier(0.4, 0, 0.2, 1), width 180ms cubic-bezier(0.4, 0, 0.2, 1)"
              : "none",
          }}
        />
      )}

      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          title={isIconOnly ? opt.label : undefined}
          className={`${btnBase} transition-colors ${
            value === opt.value
              ? "text-[var(--ds-text)]"
              : "text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
          }`}
        >
          {opt.icon}
          {!isIconOnly && opt.label}
          {opt.badge}
        </button>
      ))}
    </div>
  );
}
