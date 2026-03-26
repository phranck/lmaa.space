import type { ShopReminder } from "@lmaa/shared";

import type { DashboardMessages } from "@/i18n/messages.ts";

export function formatDisplayDate(isoString: string, locale: string): string {
  return new Date(isoString).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildCustomSummary(
  r: ShopReminder,
  reminder: DashboardMessages["shops"]["reminder"],
): string {
  const unit = r.recurrenceUnit ?? "days";
  const interval = r.recurrenceCustomDays ?? 1;
  const unitLabel: Record<string, string> = {
    days: reminder.unit.daysSingular,
    weeks: reminder.unit.weeksSingular,
    months: reminder.unit.monthsSingular,
    years: reminder.unit.yearsSingular,
  };
  const weekdays = [
    reminder.weekdays.mo,
    reminder.weekdays.tu,
    reminder.weekdays.we,
    reminder.weekdays.th,
    reminder.weekdays.fr,
    reminder.weekdays.sa,
    reminder.weekdays.su,
  ];
  let summary = ` · ${reminder.form.every.toLowerCase()} ${interval} ${unitLabel[unit] ?? unit}`;
  if (unit === "weeks" && r.recurrenceDaysOfWeek) {
    const dayNames = r.recurrenceDaysOfWeek
      .split(",")
      .map(Number)
      .sort((a, b) => a - b)
      .map((d) => weekdays[d - 1] ?? "")
      .filter(Boolean)
      .join(" ");
    if (dayNames) summary += ` (${dayNames})`;
  }
  return summary;
}
