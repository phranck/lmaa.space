import type { FieldType } from "@lmaa/contracts";

export function fieldTypeLabel(type: FieldType, labels: Record<string, string>): string {
  const key = type.replace(/-([a-z])/g, (_, character: string) => character.toUpperCase());
  return labels[key] ?? labels[type] ?? type;
}
