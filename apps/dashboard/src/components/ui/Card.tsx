interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Drops the card surface and keeps the geometry.
   *
   * @remarks
   * A caller that switches this on and off keeps one element rather than
   * swapping the container for a plain one. Swapping the element type makes
   * React discard everything inside it, so a card that holds a route would
   * remount that route on every switch.
   */
  transparent?: boolean;
}

// Pattern A — outer panel/section container
export function Card({ className, transparent = false, ...rest }: CardProps) {
  return (
    <div
      className={[
        transparent ? "rounded-card" : "bg-[var(--ds-card-bg,var(--ds-surface))] rounded-card",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

// Pattern B — list item card
export function ItemCard({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}
