import { Badge } from "@/components/ui/Badge.tsx";

interface StatusBadgeProps<T extends string> {
  value: T;
  label: string;
  colorMap: Record<T, string>;
}

/**
 * A badge whose colour follows the status it shows.
 *
 * @param value - The status, used to pick the colour.
 * @param label - The translated status name.
 * @param colorMap - One colour class per status.
 * @returns The badge.
 */
export function StatusBadge<T extends string>({ value, label, colorMap }: StatusBadgeProps<T>) {
  return <Badge colorClass={colorMap[value]}>{label}</Badge>;
}
