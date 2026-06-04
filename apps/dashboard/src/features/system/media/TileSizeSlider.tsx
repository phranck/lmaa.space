import { DotsNineIcon, SquaresFourIcon } from "@phosphor-icons/react";

interface TileSizeSliderProps {
  value: number;
  onChange: (next: number) => void;
  label: string;
  min: number;
  max: number;
  className?: string;
}

/**
 * Continuous range slider for tweaking media-grid tile size, flanked by
 * dots-nine (smaller tiles) on the left and squares-four (larger tiles) on
 * the right. Pair with `useTileSize` so the value persists per surface.
 */
export function TileSizeSlider({
  value,
  onChange,
  label,
  min,
  max,
  className,
}: TileSizeSliderProps) {
  return (
    <label
      className={`flex items-center gap-2 text-[var(--ds-text-muted)] ${className ?? ""}`}
      title={label}
    >
      <DotsNineIcon weight="duotone" className="size-4 shrink-0" aria-hidden />
      <input
        type="range"
        min={min}
        max={max}
        step="any"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="w-32 accent-[var(--color-primary)]"
      />
      <SquaresFourIcon weight="duotone" className="size-4 shrink-0" aria-hidden />
    </label>
  );
}
