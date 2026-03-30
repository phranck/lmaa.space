import { useEffect, useState } from "react";

import { API_BASE } from "@/lib/client-api";

interface BillingSummary {
  today: number;
  thisMonth: number;
}

function formatEur(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

export default function ZeropsCosts() {
  const [data, setData] = useState<BillingSummary | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/billing/summary`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) setData(json.data);
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <span className="text-xs text-stone-500">
      Hosting: {formatEur(data.today)} EUR/Tag &mdash; {formatEur(data.thisMonth)} EUR/Monat
    </span>
  );
}
