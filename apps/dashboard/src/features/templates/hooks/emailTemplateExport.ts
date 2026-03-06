import type { EmailTemplate } from "@lmaa/contracts";

import { downloadJson } from "@/lib/download.ts";

export function exportEmailTemplateSingle(template: EmailTemplate) {
  const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = template;
  downloadJson(`${template.name}.json`, {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...fields,
  });
}

export async function exportEmailTemplateAll() {
  const API_BASE = import.meta.env.VITE_API_URL ?? "/api/v1";
  const res = await fetch(`${API_BASE}/admin/email-templates/export`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "email-templates.zip";
  a.click();
  URL.revokeObjectURL(url);
}
