import {
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ClockIcon,
  DotIcon,
} from "@phosphor-icons/react";
import { de } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { createPortal } from "react-dom";

import { ControlTrigger } from "@lmaa/ui/listbox-primitives";

import { DashboardNumberInput } from "@/components/ui/DashboardControls.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

interface DateTimePickerProps {
  value: string;
  onChange: (isoLocal: string) => void;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalParts(iso: string) {
  if (!iso) return { date: undefined, hours: "12", minutes: "00" };
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00`);
  if (Number.isNaN(d.getTime())) return { date: undefined, hours: "12", minutes: "00" };
  return {
    date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
    hours: pad(d.getHours()),
    minutes: pad(d.getMinutes()),
  };
}

function emitValue(
  day: Date | undefined,
  hours: string,
  minutes: string,
  onChange: (v: string) => void,
) {
  if (!day) {
    onChange("");
    return;
  }
  const h = Math.max(0, Math.min(23, Number(hours) || 0));
  const m = Math.max(0, Math.min(59, Number(minutes) || 0));
  const y = day.getFullYear();
  const mo = pad(day.getMonth() + 1);
  const d = pad(day.getDate());
  onChange(`${y}-${mo}-${d}T${pad(h)}:${pad(m)}`);
}

function usePopoverPosition(triggerRef: React.RefObject<HTMLButtonElement | null>, open: boolean) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openAbove = spaceAbove > spaceBelow;

      setStyle({
        position: "fixed",
        left: rect.left,
        ...(openAbove ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
        zIndex: 9999,
      });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, triggerRef]);

  return style;
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const { locale } = useI18n();
  const isDe = locale === "de";
  const parts = toLocalParts(value);
  const [pickerState, setPickerState] = useState<{
    date: Date | undefined;
    hours: string;
    minutes: string;
  }>({
    date: parts.date,
    hours: parts.hours,
    minutes: parts.minutes,
  });
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverStyle = usePopoverPosition(triggerRef, open);

  const { date: selected, hours, minutes } = pickerState;

  useEffect(() => {
    const p = toLocalParts(value);
    setPickerState({ date: p.date, hours: p.hours, minutes: p.minutes });
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function handleDaySelect(day: Date | undefined) {
    setPickerState((prev) => ({ ...prev, date: day }));
    emitValue(day, hours, minutes, onChange);
  }

  function handleTimeChange(h: string, m: string) {
    setPickerState((prev) => ({ ...prev, hours: h, minutes: m }));
    emitValue(selected, h, m, onChange);
  }

  const displayDate = selected
    ? selected.toLocaleDateString(isDe ? "de-DE" : "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  const displayTime = selected ? `${hours}:${minutes}` : "";

  return (
    <>
      <ControlTrigger
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        leadingIcon={<CalendarBlankIcon weight="duotone" className="size-4" />}
        open={open}
        placeholder={isDe ? "Datum & Uhrzeit wählen" : "Pick date & time"}
      >
        {selected ? (
          <span>
            {displayDate}
            <span className="text-[var(--ds-text-muted)] mx-1">{displayTime}</span>
          </span>
        ) : null}
      </ControlTrigger>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={popoverStyle}
            className="rounded-card border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-lg p-3 w-max"
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleDaySelect}
              locale={isDe ? de : undefined}
              weekStartsOn={1}
              showOutsideDays
              classNames={{
                root: "rdp-root",
                months: "rdp-months",
                month_caption: "rdp-month-caption flex items-center justify-between mb-2",
                caption_label: "text-sm font-semibold text-[var(--ds-text)]",
                nav: "rdp-nav flex items-center gap-0.5",
                button_previous:
                  "rdp-btn p-1 rounded hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]",
                button_next:
                  "rdp-btn p-1 rounded hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]",
                weekdays: "rdp-weekdays",
                weekday:
                  "h-[var(--ds-control-h-field)] w-[var(--ds-control-h-field-large)] text-xs font-semibold text-[var(--ds-text-subtle)] uppercase",
                week: "rdp-week",
                day: "size-[var(--ds-control-h-field-large)] text-center text-sm",
                day_button:
                  "flex size-[var(--ds-control-h-field-large)] items-center justify-center rounded-full text-[var(--ds-text)] hover:bg-[var(--ds-surface-hover)]",
                today: "font-bold",
                selected:
                  "[&>button]:bg-[var(--color-primary)] [&>button]:text-white [&>button]:hover:bg-[var(--color-primary)]",
                outside: "text-[var(--ds-text-subtle)] opacity-40",
                disabled: "opacity-30 cursor-not-allowed",
              }}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === "left" ? (
                    <CaretLeftIcon weight="bold" className="size-3.5" />
                  ) : orientation === "right" ? (
                    <CaretRightIcon weight="bold" className="size-3.5" />
                  ) : (
                    <DotIcon className="size-3.5" />
                  ),
              }}
            />

            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--ds-border)]">
              <ClockIcon weight="duotone" className="size-4 text-[var(--ds-text-muted)]" />
              <DashboardNumberInput
                min={0}
                max={23}
                value={hours}
                onChange={(e) => handleTimeChange(e.target.value, minutes)}
                onBlur={() =>
                  handleTimeChange(pad(Math.max(0, Math.min(23, Number(hours) || 0))), minutes)
                }
                className="w-12 text-center"
              />
              <span className="text-sm font-medium text-[var(--ds-text-muted)]">:</span>
              <DashboardNumberInput
                min={0}
                max={59}
                value={minutes}
                onChange={(e) => handleTimeChange(hours, e.target.value)}
                onBlur={() =>
                  handleTimeChange(hours, pad(Math.max(0, Math.min(59, Number(minutes) || 0))))
                }
                className="w-12 text-center"
              />
              <span className="text-xs text-[var(--ds-text-subtle)]">Uhr</span>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
