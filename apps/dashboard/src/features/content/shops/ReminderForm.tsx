import { ClockIcon, EnvelopeSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";

import type { ReminderRecurrence, ShopReminder } from "@lmaa/shared";
import { AlertDialog, FormLabel, ToggleSwitch, formBtnBaseClass, formInputClass } from "@lmaa/ui";

import { DateTimePicker } from "@/components/ui/DateTimePicker.tsx";
import { useEmailTemplates } from "@/features/templates/hooks/useEmailTemplates.ts";

import { RECURRENCE_OPTIONS, UNIT_OPTIONS, WEEKDAYS } from "./reminder-constants.ts";

export interface ReminderFormData {
  remindAt: string;
  note: string | null;
  isActive: boolean;
  recurrence: ReminderRecurrence;
  recurrenceCustomDays: number | null;
  recurrenceUnit: string | null;
  recurrenceDaysOfWeek: string | null;
  sendEmail: boolean;
  emailTemplateId: number | null;
}

export interface ReminderFormProps {
  initial?: ShopReminder | null;
  isActive: boolean;
  onSave: (data: ReminderFormData) => void;
  onDelete?: () => void;
  isPending: boolean;
  isDeleting: boolean;
}

export function ReminderForm({ initial, isActive, onSave, onDelete, isPending, isDeleting }: ReminderFormProps) {
  const { data: emailTemplates = [] } = useEmailTemplates();

  const [remindAt, setRemindAt] = useState<string>(() =>
    initial?.remindAt ? initial.remindAt.slice(0, 16) : "",
  );
  const [note, setNote] = useState<string>(initial?.note ?? "");
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
  const [sendEmail, setSendEmail] = useState<boolean>(initial?.sendEmail ?? false);
  const [emailTemplateId, setEmailTemplateId] = useState<number | null>(
    initial?.emailTemplateId ?? null,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

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
      {/* Date + time */}
      <div>
        <FormLabel>Datum &amp; Uhrzeit</FormLabel>
        <DateTimePicker value={remindAt} onChange={setRemindAt} />
      </div>

      {/* Recurrence */}
      <div>
        <FormLabel htmlFor="reminder-recurrence">Wiederholung</FormLabel>
        <select
          id="reminder-recurrence"
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as ReminderRecurrence)}
          className={formInputClass}
        >
          {RECURRENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom recurrence sub-form */}
      {recurrence === "custom" && (
        <div className="rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] p-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-[5px] text-xs font-medium text-[var(--ds-text-muted)] shrink-0 w-20">Häufigkeit</span>
            <select
              value={customUnit}
              onChange={(e) => {
                setCustomUnit(e.target.value as "days" | "weeks" | "months" | "years");
                setCustomDaysOfWeek(new Set());
              }}
              className={`${formInputClass} flex-1`}
            >
              {UNIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-[5px] text-xs font-medium text-[var(--ds-text-muted)] shrink-0 w-20">Alle</span>
            <input
              type="number"
              min={1}
              max={999}
              value={customInterval}
              onChange={(e) => setCustomInterval(e.target.value)}
              className="px-2 py-1.5 w-16 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <span className="text-xs text-[var(--ds-text-muted)]">
              {UNIT_OPTIONS.find((o) => o.value === customUnit)?.singular ?? ""}
            </span>
          </div>

          {customUnit === "weeks" && (
            <div className="flex items-center gap-2">
              <span className="px-[5px] text-xs font-medium text-[var(--ds-text-muted)] shrink-0 w-20">an</span>
              <div className="flex gap-1">
                {WEEKDAYS.map(({ iso, label }) => (
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
          Notiz <span className="font-normal">(optional)</span>
        </FormLabel>
        <textarea
          id="reminder-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Worum geht es bei dieser Prüfung?"
          className={`${formInputClass} resize-none`}
        />
      </div>

      {/* Email toggle + template */}
      <div className="rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 px-[5px] text-xs font-medium text-[var(--ds-text-muted)]">
            <EnvelopeSimpleIcon weight="duotone" className="w-3.5 h-3.5" />
            E-Mail senden
          </span>
          <ToggleSwitch checked={sendEmail} onChange={setSendEmail} />
        </div>

        {sendEmail && emailTemplates.length > 0 && (
          <div>
            <FormLabel htmlFor="reminder-email-template">
              E-Mail-Template <span className="font-normal">(optional)</span>
            </FormLabel>
            <select
              id="reminder-email-template"
              value={emailTemplateId ?? ""}
              onChange={(e) => setEmailTemplateId(e.target.value ? Number(e.target.value) : null)}
              className={formInputClass}
            >
              <option value="">Standard (ohne Template)</option>
              {emailTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="mt-2 px-[5px]">
              <p className="text-[10px] text-[var(--ds-text-subtle)] mb-1">Verfügbare Variablen:</p>
              <div className="flex flex-wrap gap-1">
                {["shopName", "shopUrl", "reminderMessage"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}
                    title="In Zwischenablage kopieren"
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors cursor-copy"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={validationError !== null}
        title="Erinnerung kann nicht gespeichert werden"
        variant="warning"
        onClose={() => setValidationError(null)}
      >
        <p>{validationError}</p>
      </AlertDialog>

      {/* Actions */}
      <div className="flex items-center gap-2 w-full">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            const errors: string[] = [];
            if (!remindAt) errors.push("Datum & Uhrzeit muss gesetzt werden.");
            if (remindAt && new Date(remindAt) < new Date()) errors.push("Der Zeitpunkt liegt in der Vergangenheit.");
            if (recurrence === "custom" && (!Number(customInterval) || Number(customInterval) < 1)) errors.push("Das Wiederholungs-Intervall muss mindestens 1 sein.");
            if (errors.length > 0) {
              setValidationError(errors.join("\n"));
              return;
            }
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
              sendEmail,
              emailTemplateId: sendEmail ? emailTemplateId : null,
            });
          }}
          className={`${formBtnBaseClass} flex-1 justify-center border border-[var(--ds-btn-neutral-border)] text-[var(--ds-btn-neutral-text)] hover:border-[var(--ds-btn-neutral-hover-border)] hover:bg-[var(--ds-btn-neutral-hover-bg)]`}
        >
          <ClockIcon weight="duotone" className="w-3.5 h-3.5" />
          {isPending ? "Wird gespeichert\u2026" : "Erinnerung setzen"}
        </button>
        {onDelete && (
          <button
            type="button"
            disabled={isDeleting}
            onClick={onDelete}
            className={`${formBtnBaseClass} border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] hover:bg-[var(--ds-btn-danger-hover-bg)]`}
          >
            <TrashIcon weight="duotone" className="w-3.5 h-3.5" />
            {isDeleting ? "Wird gelöscht\u2026" : "Löschen"}
          </button>
        )}
      </div>
    </div>
  );
}
