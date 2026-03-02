export interface CharCounterProps {
  value: string;
  max: number;
  className?: string;
}

export function CharCounter({ value, max, className = "" }: CharCounterProps) {
  return (
    <span className={`text-xs text-[var(--ds-text-subtle)] pr-[5px] ${className}`}>
      {value.length}/{max}
    </span>
  );
}
