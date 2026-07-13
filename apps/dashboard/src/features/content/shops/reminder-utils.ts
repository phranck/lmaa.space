import type { ShopReminder } from "@lmaa/shared";

import { WEEKDAYS } from "./reminder-constants.ts";

export function formatDisplayDate(isoString: string, locale: string): string {
  return new Date(isoString).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildCustomSummary(r: ShopReminder): string {
  const unit = r.recurrenceUnit ?? "days";
  const interval = r.recurrenceCustomDays ?? 1;
  const unitLabel: Record<string, string> = {
    days: interval === 1 ? "Tag" : "Tage",
    weeks: interval === 1 ? "Woche" : "Wochen",
    months: interval === 1 ? "Monat" : "Monate",
    years: interval === 1 ? "Jahr" : "Jahre",
  };
  let summary = ` · alle ${interval} ${unitLabel[unit] ?? unit}`;
  if (unit === "weeks" && r.recurrenceDaysOfWeek) {
    const dayNames = r.recurrenceDaysOfWeek
      .split(",")
      .map(Number)
      .sort((a, b) => a - b)
      .flatMap((day) => {
        const label = WEEKDAYS.find((weekday) => weekday.iso === day)?.label;
        return label ? [label] : [];
      })
      .join(" ");
    if (dayNames) summary += ` (${dayNames})`;
  }
  return summary;
}
