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
  const className = `bg-white rounded-xl border p-5 text-center h-28 flex flex-col items-center justify-center transition-all ${
    accent ? "border-amber-200 bg-amber-50" : "border-gray-100"
  } ${href ? "hover:shadow-sm hover:border-gray-300 cursor-pointer" : ""}`;

  const content = (
    <>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent ? "text-amber-700" : "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
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
