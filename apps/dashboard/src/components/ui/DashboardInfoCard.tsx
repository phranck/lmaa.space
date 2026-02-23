import { Link } from "react-router";

export function DashboardInfoCard({
  label,
  value,
  sub,
  accent,
  href,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: boolean;
  href?: string;
}) {
  const className = `rounded-xl border p-5 text-center h-28 flex flex-col items-center justify-center transition-all shadow-sm ${
    accent
      ? "border-[var(--ds-accent)] bg-[var(--ds-accent-subtle)]"
      : "bg-[var(--ds-surface)] border-[var(--ds-border-subtle)]"
  } ${href ? "hover:shadow-md hover:border-[var(--ds-border)] cursor-pointer" : ""}`;

  const content = (
    <>
      <p className="text-sm text-[var(--ds-text-muted)] mb-1">{label}</p>
      <p
        className={`text-3xl font-bold ${accent ? "text-[var(--ds-accent)]" : "text-[var(--ds-text)]"}`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--ds-text-subtle)] mt-1">{sub}</p>}
    </>
  );

  if (href) {
    return (
      <Link to={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
