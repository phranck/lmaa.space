import type { FormConfig } from "@lmaa/contracts";

import { downloadJson } from "@/lib/download.ts";

export function exportFormConfigSingle(
  name: string,
  slug: string | undefined,
  rows: FormConfig["rows"],
  submissionConfig: FormConfig["submissionConfig"],
) {
  downloadJson(`${name}.json`, {
    version: 1,
    exportedAt: new Date().toISOString(),
    name,
    slug,
    rows,
    submissionConfig,
  });
}

export function exportFormConfigAll(forms: FormConfig[]) {
  downloadJson("forms-export.json", {
    version: 1,
    exportedAt: new Date().toISOString(),
    forms: forms.map((f) => ({
      name: f.name,
      slug: f.slug,
      rows: f.rows,
      submissionConfig: f.submissionConfig,
    })),
  });
}
