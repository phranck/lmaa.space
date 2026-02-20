import { useState, useRef, useEffect } from "react";

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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-accent)] border border-[var(--color-accent)] hover:bg-orange-50 transition-colors"
      >
        <span>♥</span>
        <span className="hidden sm:inline">Unterstützen</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-50">
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Hilf uns, dein.shop am Laufen zu halten!
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="https://paypal.me/phranck"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0070BA] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Via PayPal spenden
            </a>
            <a
              href="https://ko-fi.com/phranck"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#FF5E5B] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Via Ko-Fi spenden
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
