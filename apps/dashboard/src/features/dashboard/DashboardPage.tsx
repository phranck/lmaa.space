import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api.ts";
import { PageHeader } from "@/components/ui/PageHeader.tsx";

interface Stats {
  shops: number;
  categories: number;
  pendingSubmissions: number;
  totalSubmissions: number;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-5 ${accent ? "border-amber-200 bg-amber-50" : "border-gray-100"}`}
    >
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent ? "text-amber-700" : "text-gray-900"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<Stats>("/admin/stats"),
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Übersicht" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Übersicht</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Shops" value={stats?.shops ?? 0} />
        <StatCard label="Kategorien" value={stats?.categories ?? 0} />
        <StatCard
          label="Offene Vorschläge"
          value={stats?.pendingSubmissions ?? 0}
          accent={(stats?.pendingSubmissions ?? 0) > 0}
          sub={(stats?.pendingSubmissions ?? 0) > 0 ? "Warten auf Review" : undefined}
        />
        <StatCard
          label="Vorschläge gesamt"
          value={stats?.totalSubmissions ?? 0}
          sub="aller Zeiten"
        />
      </div>
    </div>
  );
}
