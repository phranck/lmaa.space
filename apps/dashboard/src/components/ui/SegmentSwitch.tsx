interface SegmentSwitchOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SegmentSwitchProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentSwitchOption<T>[];
  size?: "sm" | "md";
  className?: string;
}

const sizeStyles = {
  sm: {
    container: "gap-0.5 p-0.5",
    button: "px-2.5 h-6 text-xs",
  },
  md: {
    container: "gap-1 p-1",
    button: "px-3.5 h-8 text-sm",
  },
} as const;

export function SegmentSwitch<T extends string>({
  value,
  onChange,
  options,
  size = "sm",
  className,
}: SegmentSwitchProps<T>) {
  const s = sizeStyles[size];
  return (
    // biome-ignore lint/a11y/useSemanticElements: not a fieldset, role="group" is correct for segment switch
    <div
      role="group"
      className={`flex ${s.container} bg-[var(--ds-form-control-bg)] rounded-control border border-[var(--ds-border)] w-fit ${className ?? ""}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1 ${s.button} rounded-[calc(var(--radius-control)-2px)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              active
                ? "bg-[var(--ds-surface)] text-[var(--ds-text)] shadow-sm"
                : "text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
