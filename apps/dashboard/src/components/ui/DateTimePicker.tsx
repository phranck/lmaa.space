import { CalendarBlankIcon, CaretLeftIcon, CaretRightIcon, ClockIcon, DotIcon } from "@phosphor-icons/react";
import { de } from "date-fns/locale";
import { useCallback, useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { createPortal } from "react-dom";

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

function emitValue(day: Date | undefined, hours: string, minutes: string, onChange: (v: string) => void) {
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

  const update = useCallback(() => {
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
  }, [triggerRef]);

  useEffect(() => {
    if (!open) return;
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, update]);

  return style;
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const { locale } = useI18n();
  const isDe = locale === "de";
  const parts = toLocalParts(value);
  const [selected, setSelected] = useState<Date | undefined>(parts.date);
  const [hours, setHours] = useState(parts.hours);
  const [minutes, setMinutes] = useState(parts.minutes);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverStyle = usePopoverPosition(triggerRef, open);

  useEffect(() => {
    const p = toLocalParts(value);
    setSelected(p.date);
    setHours(p.hours);
    setMinutes(p.minutes);
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function handleDaySelect(day: Date | undefined) {
    setSelected(day);
    emitValue(day, hours, minutes, onChange);
  }

  function handleTimeChange(h: string, m: string) {
    setHours(h);
    setMinutes(m);
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
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 border border-[var(--ds-border)] rounded-control bg-[var(--ds-form-control-bg,var(--ds-input-bg))] text-[var(--ds-text)] text-sm hover:border-[var(--ds-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors"
      >
        <CalendarBlankIcon weight="duotone" className="w-4 h-4 text-[var(--ds-text-muted)]" />
        {selected ? (
          <span>
            {displayDate}
            <span className="text-[var(--ds-text-muted)] mx-1">{displayTime}</span>
          </span>
        ) : (
          <span className="text-[var(--ds-text-subtle)]">{isDe ? "Datum & Uhrzeit wählen" : "Pick date & time"}</span>
        )}
      </button>

      {open && createPortal(
        <div ref={popoverRef} style={popoverStyle} className="rounded-card border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-lg p-3 w-max">
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
              button_previous: "rdp-btn p-1 rounded hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors",
              button_next: "rdp-btn p-1 rounded hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors",
              weekdays: "rdp-weekdays",
              weekday: "text-xs font-semibold text-[var(--ds-text-subtle)] w-9 h-8 uppercase",
              week: "rdp-week",
              day: "text-sm w-9 h-9 text-center",
              day_button: "w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text)]",
              today: "font-bold",
              selected: "[&>button]:bg-[var(--color-primary)] [&>button]:text-white [&>button]:hover:bg-[var(--ds-btn-primary-hover)]",
              outside: "text-[var(--ds-text-subtle)] opacity-40",
              disabled: "opacity-30 cursor-not-allowed",
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === "left" ? (
                  <CaretLeftIcon weight="bold" className="w-3.5 h-3.5" />
                ) : orientation === "right" ? (
                  <CaretRightIcon weight="bold" className="w-3.5 h-3.5" />
                ) : (
                  <DotIcon className="w-3.5 h-3.5" />
                ),
            }}
          />

          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--ds-border)]">
            <ClockIcon weight="duotone" className="w-4 h-4 text-[var(--ds-text-muted)]" />
            <input
              type="number"
              min={0}
              max={23}
              value={hours}
              onChange={(e) => handleTimeChange(e.target.value, minutes)}
              onBlur={() => handleTimeChange(pad(Math.max(0, Math.min(23, Number(hours) || 0))), minutes)}
              className="w-12 px-2 py-1 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-form-control-bg,var(--ds-input-bg))] text-[var(--ds-text)] text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <span className="text-sm font-medium text-[var(--ds-text-muted)]">:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={minutes}
              onChange={(e) => handleTimeChange(hours, e.target.value)}
              onBlur={() => handleTimeChange(hours, pad(Math.max(0, Math.min(59, Number(minutes) || 0))))}
              className="w-12 px-2 py-1 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-form-control-bg,var(--ds-input-bg))] text-[var(--ds-text)] text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <span className="text-xs text-[var(--ds-text-subtle)]">Uhr</span>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
