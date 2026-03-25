interface SkeletonRowsProps {
  count?: number;
  height?: string;
}

export function SkeletonRows({ count = 4, height = "h-14" }: SkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => `sk-${i}`).map((key) => (
        <div
          key={key}
          className={`${height} bg-[var(--ds-surface)] animate-pulse border-b border-[var(--ds-border-subtle)]`}
        />
      ))}
    </>
  );
}
