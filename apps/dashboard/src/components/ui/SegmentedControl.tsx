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
  const isIconOnly = options.every((o) => o.icon && !o.label);
  const btnBase = isIconOnly
    ? `flex items-center justify-center ${size === "sm" ? "w-7 h-7" : "w-8 h-8"} rounded-md transition-colors`
    : `flex items-center gap-2 ${size === "sm" ? "px-3 py-1" : "px-4 py-1.5"} rounded-md ${size === "sm" ? "text-xs" : "text-sm"} font-medium transition-colors`;

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-[var(--ds-segment-bg)] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          title={isIconOnly ? opt.label : undefined}
          className={`${btnBase} ${
            value === opt.value
              ? "bg-[var(--ds-segment-active-bg)] text-[var(--ds-text)] shadow-sm"
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
