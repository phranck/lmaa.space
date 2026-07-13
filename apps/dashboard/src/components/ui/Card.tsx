// Pattern A — outer panel/section container
export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["bg-[var(--ds-card-bg,var(--ds-surface))] rounded-card", className]
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
