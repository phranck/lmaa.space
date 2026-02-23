import { useEffect, useRef, useState } from "react";
import { LuCheck, LuChevronDown } from "react-icons/lu";

interface MultiSelectOption {
  id: number;
  name: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  error?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Auswählen…",
  error,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function toggle(id: number) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  const label =
    value.length === 0
      ? null
      : value.length === 1
        ? options.find((o) => o.id === value[0])?.name
        : `${value.length} Kategorien ausgewählt`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-control text-sm text-left bg-white transition-colors ${
          open
            ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20"
            : error
              ? "border-red-400"
              : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <span className={`truncate ${label ? "text-gray-900" : "text-gray-400"}`}>
          {label ?? placeholder}
        </span>
        <LuChevronDown
          size={14}
          className={`shrink-0 ml-2 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-control shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {options.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">Keine Kategorien vorhanden.</p>
            )}
            {options.map((opt) => {
              const checked = value.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                    checked
                      ? "bg-[var(--color-primary)]/5 text-gray-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`w-4 h-4 shrink-0 flex items-center justify-center rounded border transition-colors ${
                      checked
                        ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                        : "border-gray-300"
                    }`}
                  >
                    {checked && <LuCheck size={10} className="text-white" strokeWidth={3} />}
                  </span>
                  {opt.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}
