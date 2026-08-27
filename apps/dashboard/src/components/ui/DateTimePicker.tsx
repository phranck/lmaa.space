import {
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ClockIcon,
  DotIcon,
  XIcon,
} from "@phosphor-icons/react";
import { de } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { createPortal } from "react-dom";

import { ControlTrigger } from "@lmaa/ui/listbox-primitives";

import { DashboardNumberInput } from "@/components/ui/DashboardControls.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

/**
 * What the picker asks for.
 *
 * The mode decides the shape of the value as well as the shape of the control,
 * because a field that only asks for a day should also only hand back a day.
 * Otherwise every caller has to cut the part it did not want back off again.
 */
export type DateTimePickerMode = "datetime" | "date" | "time";

interface DateTimePickerProps {
  /**
   * The current value: `YYYY-MM-DDTHH:MM` for `datetime`, `YYYY-MM-DD` for
   * `date`, `HH:MM` for `time`. Empty means nothing is chosen.
   */
  value: string;
  onChange: (value: string) => void;
  /**
   * Whether the value may be emptied again.
   *
   * Off by default, because most fields that take a date want one. On where an
   * empty value means something, such as a window with no end.
   */
  clearable?: boolean;
  /** What to ask for. Both parts by default. */
  mode?: DateTimePickerMode;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalParts(iso: string, mode: DateTimePickerMode) {
  if (!iso) return { date: undefined, hours: "12", minutes: "00" };

  if (mode === "time") {
    const [rawHours = "12", rawMinutes = "00"] = iso.split(":");
    return { date: undefined, hours: pad(Number(rawHours) || 0), minutes: pad(Number(rawMinutes) || 0) };
  }

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
  mode: DateTimePickerMode,
  onChange: (v: string) => void,
) {
  const h = pad(Math.max(0, Math.min(23, Number(hours) || 0)));
  const m = pad(Math.max(0, Math.min(59, Number(minutes) || 0)));

  if (mode === "time") {
    onChange(`${h}:${m}`);
    return;
  }

  if (!day) {
    onChange("");
    return;
  }

  const stamp = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
  onChange(mode === "date" ? stamp : `${stamp}T${h}:${m}`);
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

export function DateTimePicker({
  value,
  onChange,
  mode = "datetime",
  clearable = false,
}: DateTimePickerProps) {
  const { locale } = useI18n();
  const isDe = locale === "de";
  const { date: selected, hours, minutes } = toLocalParts(value, mode);
  const showDate = mode !== "time";
  const showTime = mode !== "date";
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverStyle = usePopoverPosition(triggerRef, open);

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
    emitValue(day, hours, minutes, mode, onChange);
  }

  function handleTimeChange(h: string, m: string) {
    emitValue(selected, h, m, mode, onChange);
  }

  const displayDate = selected
    ? selected.toLocaleDateString(isDe ? "de-DE" : "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  const displayTime = mode === "time" || selected ? `${hours}:${minutes}` : "";
  const hasValue = mode === "time" ? value !== "" : Boolean(selected);

  const placeholder = isDe
    ? mode === "date"
      ? "Datum wählen"
      : mode === "time"
        ? "Uhrzeit wählen"
        : "Datum & Uhrzeit wählen"
    : mode === "date"
      ? "Pick a date"
      : mode === "time"
        ? "Pick a time"
        : "Pick date & time";

  return (
    <>
      <ControlTrigger
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        leadingIcon={
          mode === "time" ? (
            <ClockIcon weight="duotone" className="size-4" />
          ) : (
            <CalendarBlankIcon weight="duotone" className="size-4" />
          )
        }
        open={open}
        placeholder={placeholder}
      >
        {hasValue ? (
          <span>
            {showDate && displayDate}
            {showDate && showTime && (
              <span className="text-[var(--ds-text-muted)] mx-1">{displayTime}</span>
            )}
            {!showDate && displayTime}
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
            {showDate && (
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
            )}

            {showTime && (
            <div className={`flex items-center gap-2 ${showDate ? "mt-2 pt-2 border-t border-[var(--ds-border)]" : ""}`}>
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
            )}

            {/* Ends the popover at its right edge, and only whilst there is
                something to remove. */}
            {clearable && hasValue && (
              <div className="mt-2 pt-2 flex justify-end border-t border-[var(--ds-border)]">
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
                >
                  <XIcon weight="bold" className="size-3" />
                  {isDe ? "Entfernen" : "Clear"}
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
