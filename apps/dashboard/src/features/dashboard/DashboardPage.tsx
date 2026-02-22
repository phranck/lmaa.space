import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api.ts";
import { DashboardInfoCard } from "@/components/ui/DashboardInfoCard.tsx";

interface Stats {
  shops: number;
  categories: number;
  pendingSubmissions: number;
  totalSubmissions: number;
}

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<Stats>("/admin/stats"),
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Übersicht</h1>
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
        <DashboardInfoCard label="Shops" value={stats?.shops ?? 0} />
        <DashboardInfoCard label="Kategorien" value={stats?.categories ?? 0} />
        <DashboardInfoCard
          label="Offene Vorschläge"
          value={stats?.pendingSubmissions ?? 0}
          accent={(stats?.pendingSubmissions ?? 0) > 0}
          sub={(stats?.pendingSubmissions ?? 0) > 0 ? "Warten auf Review" : undefined}
        />
        <DashboardInfoCard
          label="Vorschläge gesamt"
          value={stats?.totalSubmissions ?? 0}
          sub="aller Zeiten"
        />
      </div>
    </div>
  );
}
