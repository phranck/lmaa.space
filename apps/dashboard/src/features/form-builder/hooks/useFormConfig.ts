import { api } from "@/lib/api.ts";
import type { FormConfig, FormConfigPayload } from "@lmaa/contracts";

// ─── Export utilities ──────────────────────────────────────────────────────────

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface CreateFormConfigInput {
  name: string;
  slug?: string;
}

/**
 * Loads the full list of form configurations.
 *
 * @returns React Query result with the form config list.
 */
export function useFormConfigs() {
  return useQuery({
    queryKey: ["form-configs"],
    queryFn: () => api.get<FormConfig[]>("/admin/form-configs"),
  });
}

/**
 * Loads a single form configuration by name.
 *
 * Returns `null` on 404 (form not yet created), propagates other errors.
 *
 * @param name - The unique form config name (e.g. "suggestion-form").
 * @returns React Query result with the config or `null`.
 */
export function useFormConfig(name: string) {
  return useQuery({
    queryKey: ["form-config", name],
    queryFn: async () => {
      try {
        return await api.get<FormConfig>(`/admin/form-configs/${name}`);
      } catch (err: unknown) {
        // Treat 404 as "not yet created" — start with empty rows
        if (
          err &&
          typeof err === "object" &&
          "status" in err &&
          (err as { status: number }).status === 404
        ) {
          return null;
        }
        throw err;
      }
    },
  });
}

/**
 * Saves (upserts) a form configuration by name via PUT.
 *
 * @param name - The unique form config name to save.
 * @returns React Query mutation for saving the form config payload.
 */
export function useSaveFormConfig(name: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FormConfigPayload) =>
      api.put<FormConfig>(`/admin/form-configs/${name}`, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["form-configs"] });
      void qc.invalidateQueries({ queryKey: ["form-config", name] });
    },
  });
}

/**
 * Creates a new empty form configuration via POST.
 *
 * @returns React Query mutation for creating a new form config.
 */
export function useCreateFormConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFormConfigInput) =>
      api.post<FormConfig>("/admin/form-configs", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["form-configs"] });
    },
  });
}

/**
 * Deletes a form configuration by name via DELETE.
 *
 * @returns React Query mutation for deleting a form config.
 */
export function useDeleteFormConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.delete(`/admin/form-configs/${name}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["form-configs"] });
    },
  });
}

interface ImportFormConfigInput {
  name: string;
  slug?: string;
  rows: FormConfig["rows"];
  submissionConfig?: FormConfig["submissionConfig"];
  overwrite?: boolean;
}

/**
 * Imports a form config from an export payload via POST.
 *
 * Returns 409 on name conflict (when overwrite is false).
 * Invalidates the form-configs list on success.
 *
 * @returns React Query mutation for importing a form config.
 */
export function useImportFormConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportFormConfigInput) =>
      api.post<FormConfig>("/admin/form-configs/import", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["form-configs"] });
    },
  });
}

/**
 * Sets the active state of a form config via PATCH.
 *
 * @returns React Query mutation for toggling the active flag.
 */
export function useSetFormConfigActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, isActive }: { name: string; isActive: boolean }) =>
      api.patch<FormConfig>(`/admin/form-configs/${name}/active`, { isActive }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["form-configs"] });
    },
  });
}
