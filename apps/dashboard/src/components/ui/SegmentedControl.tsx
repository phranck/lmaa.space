import { useCallback, useLayoutEffect, useRef, useState } from "react";

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
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
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

  const measurePill = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const buttons = container.querySelectorAll<HTMLButtonElement>("button");
    const btn = buttons[activeIndex];
    if (!btn) {
      setPill((prev) => (prev === null ? prev : null));
      return;
    }
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    const next = { left: bRect.left - cRect.left, width: bRect.width, height: bRect.height };
    setPill((prev) => {
      if (
        prev &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.height === next.height
      ) {
        return prev;
      }
      return next;
    });
    didMount.current = true;
  }, [activeIndex]);

  // Re-measure when selected segment changes
  useLayoutEffect(() => {
    measurePill();
  }, [measurePill]);

  // Re-measure when container/button sizes change (e.g. async badges, viewport resize)
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => measurePill());
    const container = containerRef.current;
    if (container) {
      observer.observe(container);
      for (const button of container.querySelectorAll<HTMLButtonElement>("button")) {
        observer.observe(button);
      }
    }

    const handleResize = () => measurePill();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [measurePill]);

  const h = "h-7";
  const w = iconOnly ? "w-7" : "";
  const px = iconOnly ? "" : "px-3.5";

  return (
    <div
      ref={containerRef}
      className="relative flex items-center bg-[var(--ds-segment-bg)] rounded-control p-1"
    >
      {/* Sliding pill indicator */}
      {pill && (
        <div
          aria-hidden="true"
          className="absolute rounded-[4px] bg-[var(--ds-segment-active-bg)] shadow-sm pointer-events-none"
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
              "relative z-10 flex items-center justify-center gap-1.5 rounded-[4px] text-sm font-medium transition-colors",
              h,
              w,
              px,
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
