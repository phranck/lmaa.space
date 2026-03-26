import { ClockIcon, TrashIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import type { ReminderRecurrence, ShopReminder } from "@lmaa/shared";
import { FormLabel, ToggleSwitch, formBtnBaseClass, formInputClass } from "@lmaa/ui";

import { useI18n } from "@/context/I18nContext.tsx";

import { getRecurrenceOptions, getUnitOptions, getWeekdays } from "./reminder-constants.ts";

export interface ReminderFormProps {
  initial?: ShopReminder | null;
  onSave: (data: {
    remindAt: string;
    note: string | null;
    isActive: boolean;
    recurrence: ReminderRecurrence;
    recurrenceCustomDays: number | null;
    recurrenceUnit: string | null;
    recurrenceDaysOfWeek: string | null;
  }) => void;
  onDelete?: () => void;
  isPending: boolean;
  isDeleting: boolean;
}

export function ReminderForm({ initial, onSave, onDelete, isPending, isDeleting }: ReminderFormProps) {
  const { messages } = useI18n();
  const f = messages.shops.reminder.form;
  const recurrenceOptions = useMemo(() => getRecurrenceOptions(messages.shops.reminder.recurrence), [messages]);
  const unitOptions = useMemo(() => getUnitOptions(messages.shops.reminder.unit), [messages]);
  const weekdays = useMemo(() => getWeekdays(messages.shops.reminder.weekdays), [messages]);

  const [remindAt, setRemindAt] = useState<string>(() =>
    initial?.remindAt ? initial.remindAt.slice(0, 16) : "",
  );
  const [note, setNote] = useState<string>(initial?.note ?? "");
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? false);
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>(
    initial?.recurrence ?? "never",
  );
  const [customInterval, setCustomInterval] = useState<string>(
    initial?.recurrenceCustomDays != null ? String(initial.recurrenceCustomDays) : "1",
  );
  const [customUnit, setCustomUnit] = useState<"days" | "weeks" | "months" | "years">(
    (initial?.recurrenceUnit as "days" | "weeks" | "months" | "years") ?? "weeks",
  );
  const [customDaysOfWeek, setCustomDaysOfWeek] = useState<Set<number>>(() => {
    if (initial?.recurrenceDaysOfWeek) {
      return new Set(initial.recurrenceDaysOfWeek.split(",").map(Number).filter(Boolean));
    }
    return new Set<number>();
  });

  const toggleDay = (day: number) => {
    setCustomDaysOfWeek((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* Active toggle */}
      <div className="flex items-center justify-between">
        <span className="block px-[5px] text-xs font-medium text-[var(--ds-text-muted)]">
          {f.activeLabel}
        </span>
        <ToggleSwitch checked={isActive} onChange={setIsActive} />
      </div>

      {/* Date + time */}
      <div>
        <FormLabel htmlFor="reminder-date">{f.dateTime}</FormLabel>
        <input
          id="reminder-date"
          type="datetime-local"
          value={remindAt}
          onChange={(e) => setRemindAt(e.target.value)}
          className={formInputClass}
        />
      </div>

      {/* Recurrence */}
      <div>
        <FormLabel htmlFor="reminder-recurrence">{f.recurrence}</FormLabel>
        <select
          id="reminder-recurrence"
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as ReminderRecurrence)}
          className={formInputClass}
        >
          {recurrenceOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom recurrence sub-form */}
      {recurrence === "custom" && (
        <div className="rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] p-3 space-y-3">
          {/* Frequency */}
          <div className="flex items-center gap-2">
            <span className="px-[5px] text-xs font-medium text-[var(--ds-text-muted)] shrink-0 w-20">{f.frequency}</span>
            <select
              value={customUnit}
              onChange={(e) => {
                setCustomUnit(e.target.value as "days" | "weeks" | "months" | "years");
                setCustomDaysOfWeek(new Set());
              }}
              className={`${formInputClass} flex-1`}
            >
              {unitOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Interval */}
          <div className="flex items-center gap-2">
            <span className="px-[5px] text-xs font-medium text-[var(--ds-text-muted)] shrink-0 w-20">{f.every}</span>
            <input
              type="number"
              min={1}
              max={999}
              value={customInterval}
              onChange={(e) => setCustomInterval(e.target.value)}
              className="px-2 py-1.5 w-16 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <span className="text-xs text-[var(--ds-text-muted)]">
              {unitOptions.find((o) => o.value === customUnit)?.singular ?? ""}
            </span>
          </div>

          {/* Weekday picker — only for weeks */}
          {customUnit === "weeks" && (
            <div className="flex items-center gap-2">
              <span className="px-[5px] text-xs font-medium text-[var(--ds-text-muted)] shrink-0 w-20">{f.onDays}</span>
              <div className="flex gap-1">
                {weekdays.map(({ iso, label }) => (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => toggleDay(iso)}
                    className={`h-7 w-7 rounded text-xs font-medium transition-colors ${
                      customDaysOfWeek.has(iso)
                        ? "bg-[var(--ds-text-subtle)] text-[var(--ds-bg)]"
                        : "bg-[var(--ds-bg)] border border-[var(--ds-border)] text-[var(--ds-text-subtle)] hover:border-[var(--ds-border-strong)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Note */}
      <div>
        <FormLabel htmlFor="reminder-note">
          {f.noteLabel} <span className="font-normal">{f.noteOptional}</span>
        </FormLabel>
        <textarea
          id="reminder-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder={f.notePlaceholder}
          className={`${formInputClass} resize-none`}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 w-full">
        <button
          type="button"
          disabled={!remindAt || isPending}
          onClick={() => {
            if (!remindAt) return;
            const interval = Number(customInterval) || 1;
            const daysOfWeek =
              recurrence === "custom" && customUnit === "weeks" && customDaysOfWeek.size > 0
                ? [...customDaysOfWeek].sort((a, b) => a - b).join(",")
                : null;
            onSave({
              remindAt: new Date(remindAt).toISOString(),
              note: note.trim() || null,
              isActive,
              recurrence,
              recurrenceCustomDays: recurrence === "custom" ? interval : null,
              recurrenceUnit: recurrence === "custom" ? customUnit : null,
              recurrenceDaysOfWeek: daysOfWeek,
            });
          }}
          className={`${formBtnBaseClass} flex-1 justify-center border border-[var(--ds-btn-neutral-border)] text-[var(--ds-btn-neutral-text)] hover:border-[var(--ds-btn-neutral-hover-border)] hover:bg-[var(--ds-btn-neutral-hover-bg)]`}
        >
          <ClockIcon weight="duotone" className="w-3.5 h-3.5" />
          {isPending ? f.saving : f.save}
        </button>
        {onDelete && (
          <button
            type="button"
            disabled={isDeleting}
            onClick={onDelete}
            className={`${formBtnBaseClass} border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] hover:bg-[var(--ds-btn-danger-hover-bg)]`}
          >
            <TrashIcon weight="duotone" className="w-3.5 h-3.5" />
            {isDeleting ? f.deleting : f.delete}
          </button>
        )}
      </div>
    </div>
  );
}
