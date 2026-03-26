import type { ReminderRecurrence } from "@lmaa/shared";

import type { DashboardMessages } from "@/i18n/messages.ts";

type ReminderMessages = DashboardMessages["shops"]["reminder"];

export function getRecurrenceLabels(r: ReminderMessages["recurrence"]): Record<ReminderRecurrence, string> {
  return r;
}

export function getRecurrenceOptions(
  r: ReminderMessages["recurrence"],
): { value: ReminderRecurrence; label: string }[] {
  return Object.entries(r).map(([value, label]) => ({
    value: value as ReminderRecurrence,
    label: value === "custom" ? `${label}\u2026` : label,
  }));
}

export function getUnitOptions(u: ReminderMessages["unit"]): {
  value: "days" | "weeks" | "months" | "years";
  label: string;
  singular: string;
}[] {
  return [
    { value: "days", label: u.daysLabel, singular: u.daysSingular },
    { value: "weeks", label: u.weeksLabel, singular: u.weeksSingular },
    { value: "months", label: u.monthsLabel, singular: u.monthsSingular },
    { value: "years", label: u.yearsLabel, singular: u.yearsSingular },
  ];
}

export function getWeekdays(w: ReminderMessages["weekdays"]): { iso: number; label: string }[] {
  return [
    { iso: 1, label: w.mo },
    { iso: 2, label: w.tu },
    { iso: 3, label: w.we },
    { iso: 4, label: w.th },
    { iso: 5, label: w.fr },
    { iso: 6, label: w.sa },
    { iso: 7, label: w.su },
  ];
}
