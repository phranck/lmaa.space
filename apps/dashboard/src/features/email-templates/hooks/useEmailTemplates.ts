import { api } from "@/lib/api.ts";
import type { EmailTemplate, EmailTemplateInput } from "@lmaa/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export function exportEmailTemplateSingle(template: EmailTemplate) {
  const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = template;
  downloadJson(`${template.name}.json`, {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...fields,
  });
}

export async function exportEmailTemplateAll() {
  const API_BASE = import.meta.env.VITE_API_URL ?? "/api";
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

// ─── Import ────────────────────────────────────────────────────────────────────

export type ImportEmailTemplateInput = EmailTemplateInput & { overwrite: boolean };

/**
 * Loads the full list of email templates.
 */
export function useEmailTemplates() {
  return useQuery({
    queryKey: ["email-templates"],
    queryFn: () => api.get<EmailTemplate[]>("/admin/email-templates"),
  });
}

/**
 * Loads a single email template by ID.
 */
export function useEmailTemplate(id: number) {
  return useQuery({
    queryKey: ["email-template", id],
    queryFn: () => api.get<EmailTemplate>(`/admin/email-templates/${id}`),
    enabled: id > 0,
  });
}

/**
 * Creates a new email template via POST.
 */
export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EmailTemplateInput) =>
      api.post<EmailTemplate>("/admin/email-templates", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["email-templates"] });
    },
  });
}

/**
 * Updates an existing email template by ID via PUT.
 */
export function useUpdateEmailTemplate(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<EmailTemplateInput>) =>
      api.put<EmailTemplate>(`/admin/email-templates/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["email-templates"] });
      void qc.invalidateQueries({ queryKey: ["email-template", id] });
    },
  });
}

/**
 * Deletes an email template by ID via DELETE.
 */
export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/email-templates/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["email-templates"] });
    },
  });
}

/**
 * Imports a single email template (create or overwrite by name).
 */
export function useImportEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportEmailTemplateInput) =>
      api.post<EmailTemplate>("/admin/email-templates/import", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["email-templates"] });
    },
  });
}
