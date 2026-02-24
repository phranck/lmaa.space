import { useEffect, useRef, useState } from "react";
import { SFHeartFill } from "sf-symbols-lib/monochrome";
import { KoFiIcon } from "./KoFiIcon.tsx";

export function DonateButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-amber-700 border border-amber-300 hover:bg-amber-50 transition-colors"
      >
        <SFHeartFill size={14} aria-hidden="true" />
        <span className="hidden sm:inline">Unterstützen</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-stone-100 p-4 z-50">
          <p className="text-xs text-stone-500 mb-3 leading-relaxed">
            Hilf uns, lmaa.space am Laufen zu halten!
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="https://ko-fi.com/layeredwork?ref=lmaa.space"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#FF5E5B] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <KoFiIcon />
              Via Ko-Fi spenden
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
