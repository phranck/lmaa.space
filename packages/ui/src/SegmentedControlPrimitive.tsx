import { useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { cx } from "./classNames";

export interface SegmentedControlPrimitiveOption<T extends string = string> {
  badge?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  label?: ReactNode;
  value: T;
}

export type SegmentedControlPrimitiveSize = "compact" | "default" | "large";
export type SegmentedControlPrimitiveVariant = "filled" | "outline";

export interface SegmentedControlPrimitiveProps<T extends string = string> {
  "aria-label"?: string;
  className?: string;
  itemClassName?: string;
  onValueChange: (value: T) => void;
  options: readonly SegmentedControlPrimitiveOption<T>[];
  size?: SegmentedControlPrimitiveSize;
  value: T;
  variant?: SegmentedControlPrimitiveVariant;
}

interface SegmentPill {
  height: number;
  left: number;
  width: number;
}

const sizeClass: Record<SegmentedControlPrimitiveSize, string> = {
  compact: "h-[calc(var(--ds-control-h-field)-0.25rem)] px-2.5 text-sm",
  default: "h-[calc(var(--ds-control-h-field)-0.25rem)] px-3 text-sm",
  large: "h-[calc(var(--ds-control-h-field-large)-0.25rem)] px-4 text-sm",
};

const iconOnlySizeClass: Record<SegmentedControlPrimitiveSize, string> = {
  compact:
    "h-[calc(var(--ds-control-h-field)-0.25rem)] w-[calc(var(--ds-control-h-field)-0.25rem)] text-sm",
  default:
    "h-[calc(var(--ds-control-h-field)-0.25rem)] w-[calc(var(--ds-control-h-field)-0.25rem)] text-sm",
  large:
    "h-[calc(var(--ds-control-h-field-large)-0.25rem)] w-[calc(var(--ds-control-h-field-large)-0.25rem)] text-sm",
};

const containerSizeClass: Record<SegmentedControlPrimitiveSize, string> = {
  compact: "h-[var(--ds-control-h-field)]",
  default: "h-[var(--ds-control-h-field)]",
  large: "h-[var(--ds-control-h-field-large)]",
};

function handleSegmentedControlKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  const direction = getSegmentKeyDirection(event.key);
  if (direction === null && event.key !== "Home" && event.key !== "End") return;

  const buttons = getSegmentButtons(event.currentTarget).filter((button) => !button.disabled);
  if (buttons.length === 0) return;

  const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
  let nextIndex = currentIndex >= 0 ? currentIndex : 0;

  if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = buttons.length - 1;
  } else if (direction !== null) {
    nextIndex =
      currentIndex >= 0
        ? (currentIndex + direction + buttons.length) % buttons.length
        : direction > 0
          ? 0
          : buttons.length - 1;
  }

  event.preventDefault();
  buttons[nextIndex]?.focus();
  buttons[nextIndex]?.click();
}

export function SegmentedControlPrimitive<T extends string = string>({
  "aria-label": ariaLabel,
  className,
  itemClassName,
  onValueChange,
  options,
  size = "default",
  value,
  variant = "filled",
}: SegmentedControlPrimitiveProps<T>) {
  const activeIndex = options.findIndex((option) => option.value === value);
  const hasIcons = options.some((option) => Boolean(option.icon));
  const hasLabels = options.some((option) => Boolean(option.label));
  const iconOnly = hasIcons && !hasLabels;
  const containerRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);
  const [pill, setPill] = useState<SegmentPill | null>(null);

  const measurePill = useEffectEvent(() => {
    const container = containerRef.current;
    if (!container || activeIndex < 0) {
      setPill((previous) => (previous === null ? previous : null));
      return;
    }

    const buttons = getSegmentButtons(container);
    const activeButton = buttons[activeIndex];
    if (!activeButton) {
      setPill((previous) => (previous === null ? previous : null));
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    const containerStyle = getComputedStyle(container);
    const borderLeft = Number.parseFloat(containerStyle.borderLeftWidth) || 0;
    const nextPill = {
      height: buttonRect.height,
      left: buttonRect.left - containerRect.left - borderLeft,
      width: buttonRect.width,
    };

    setPill((previous) => {
      if (
        previous &&
        previous.height === nextPill.height &&
        previous.left === nextPill.left &&
        previous.width === nextPill.width
      ) {
        return previous;
      }
      return nextPill;
    });
    didMountRef.current = true;
  });

  useLayoutEffect(() => {
    measurePill();
  }, [activeIndex, options]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleResize = () => measurePill();
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    for (const button of getSegmentButtons(container)) {
      observer.observe(button);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [options]);

  return (
    <div
      aria-label={ariaLabel}
      className={cx(
        "relative flex w-fit items-center rounded-control p-px",
        containerSizeClass[size],
        variant === "outline"
          ? "border border-[var(--ds-border)] bg-[var(--ds-form-control-bg)]"
          : "border border-transparent bg-[var(--ds-segment-bg)]",
        className,
      )}
      onKeyDown={handleSegmentedControlKeyDown}
      ref={containerRef}
      role="group"
    >
      {pill && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-[calc(var(--radius-control)-2px)] border border-[var(--ds-segment-active-border,var(--ds-border))] bg-[var(--ds-segment-active-bg,var(--ds-control-active-bg))]"
          style={{
            height: pill.height,
            left: pill.left,
            top: "50%",
            transform: "translateY(-50%)",
            transition: didMountRef.current
              ? "left 200ms cubic-bezier(0.4, 0, 0.2, 1), width 200ms cubic-bezier(0.4, 0, 0.2, 1)"
              : "none",
            width: pill.width,
          }}
        />
      )}

      {options.map((option) => {
        const isActive = option.value === value;
        const accessibleLabel =
          typeof option.label === "string" ? option.label : String(option.value);

        return (
          <button
            aria-label={iconOnly ? accessibleLabel : undefined}
            aria-pressed={isActive}
            className={cx(
              "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-[calc(var(--radius-control)-2px)] font-medium transition-colors",
              "focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-[var(--ds-control-disabled-opacity)]",
              iconOnly ? iconOnlySizeClass[size] : sizeClass[size],
              isActive
                ? "text-[var(--ds-text)]"
                : "text-[var(--ds-text-subtle,var(--ds-text-muted))] hover:text-[var(--ds-text)]",
              itemClassName,
            )}
            data-segmented-control-item="true"
            disabled={option.disabled}
            key={option.value}
            onClick={() => {
              if (!option.disabled) {
                onValueChange(option.value);
              }
            }}
            tabIndex={isActive ? 0 : -1}
            type="button"
          >
            {option.icon}
            {hasLabels && option.label && <span>{option.label}</span>}
            {option.badge}
          </button>
        );
      })}
    </div>
  );
}

function getSegmentButtons(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-segmented-control-item='true']"),
  );
}

function getSegmentKeyDirection(key: string) {
  if (key === "ArrowRight" || key === "ArrowDown") {
    return 1;
  }
  if (key === "ArrowLeft" || key === "ArrowUp") {
    return -1;
  }
  return null;
}
