interface StatusBadgeProps<T extends string> {
  value: T;
  label: string;
  colorMap: Record<T, string>;
}

export function StatusBadge<T extends string>({ value, label, colorMap }: StatusBadgeProps<T>) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[value]}`}
    >
      {label}
    </span>
  );
}
