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

// Pattern B — form section with uppercase label title
interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
}
export function SectionCard({ title, className, children, ...rest }: SectionCardProps) {
  return (
    <div
      className={["space-y-4 p-4 rounded-control border border-[var(--ds-border)]", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <h2 className="text-xs font-semibold text-[var(--ds-text-muted)] uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </div>
  );
}

// Pattern C — list item card
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
