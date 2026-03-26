import type { ReminderRecurrence } from "@lmaa/shared";

export const RECURRENCE_LABELS: Record<ReminderRecurrence, string> = {
  never: "Nie",
  daily: "Täglich",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
  yearly: "Jährlich",
  custom: "Benutzerdefiniert",
};

export const RECURRENCE_OPTIONS: { value: ReminderRecurrence; label: string }[] = Object.entries(
  RECURRENCE_LABELS,
).map(([value, label]) => ({
  value: value as ReminderRecurrence,
  label: value === "custom" ? `${label}\u2026` : label,
}));

export const UNIT_OPTIONS: {
  value: "days" | "weeks" | "months" | "years";
  label: string;
  singular: string;
}[] = [
  { value: "days", label: "Täglich", singular: "Tag(e)" },
  { value: "weeks", label: "Wöchentlich", singular: "Woche(n)" },
  { value: "months", label: "Monatlich", singular: "Monat(e)" },
  { value: "years", label: "Jährlich", singular: "Jahr(e)" },
];

export const WEEKDAYS: { iso: number; label: string }[] = [
  { iso: 1, label: "Mo" },
  { iso: 2, label: "Di" },
  { iso: 3, label: "Mi" },
  { iso: 4, label: "Do" },
  { iso: 5, label: "Fr" },
  { iso: 6, label: "Sa" },
  { iso: 7, label: "So" },
];
