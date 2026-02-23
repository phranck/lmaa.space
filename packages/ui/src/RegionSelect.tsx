import { useEffect, useRef, useState } from "react";
import { LuInfo, LuX } from "react-icons/lu";

export const REGION_OPTIONS = [
  { code: "DE", flag: "🇩🇪", name: "Deutschland" },
  { code: "AT", flag: "🇦🇹", name: "Österreich" },
  { code: "CH", flag: "🇨🇭", name: "Schweiz" },
  { code: "EU", flag: "🇪🇺", name: "Europa" },
] as const;

export type RegionCode = (typeof REGION_OPTIONS)[number]["code"];

export interface RegionSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

export function RegionSelect({ value, onChange, error }: RegionSelectProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!infoRef.current?.contains(target) && !infoButtonRef.current?.contains(target)) {
        setInfoOpen(false);
      }
    }
    if (infoOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [infoOpen]);

  function toggle(code: string) {
    if (value.includes(code)) {
      onChange(value.filter((v) => v !== code));
    } else {
      onChange([...value, code]);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs font-medium text-gray-600">Region</span>
        <div className="relative">
          <button
            ref={infoButtonRef}
            type="button"
            onClick={() => setInfoOpen((o) => !o)}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Info zur Regionauswahl"
          >
            <LuInfo size={13} />
          </button>
          {infoOpen && (
            <div
              ref={infoRef}
              className="absolute left-0 top-6 z-50 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs text-gray-600 leading-relaxed"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-medium text-gray-800">Was bedeutet Region?</span>
                <button
                  type="button"
                  onClick={() => setInfoOpen(false)}
                  className="shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <LuX size={12} />
                </button>
              </div>
              Gibt an, ob dieser Shop eine eigene Website für die jeweilige Region hat. Bei
              Deutschland, Österreich und der Schweiz ist das meist an der TLD erkennbar (.de, .at,
              .ch). Bei Europa können auch .com, .biz oder andere internationale Domains genutzt
              werden.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {REGION_OPTIONS.map(({ code, flag, name }) => {
          const selected = value.includes(code);
          return (
            <button
              key={code}
              type="button"
              onClick={() => toggle(code)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                selected
                  ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span>{flag}</span>
              <span>{name}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}
