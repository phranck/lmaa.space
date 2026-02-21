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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-amber-700 border border-amber-300 hover:bg-amber-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-2.01C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.71a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
        </svg>
        <span className="hidden sm:inline">Unterstützen</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-stone-100 p-4 z-50">
          <p className="text-xs text-stone-500 mb-3 leading-relaxed">
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
