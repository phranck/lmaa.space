import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { EmailTemplate, EmailTemplateInput } from "@lmaa/contracts";

import { api } from "@/lib/api.ts";

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
 * Sends a template as a test email to the currently logged-in admin.
 *
 * @returns A mutation whose input is the template id and whose result carries
 *   the recipient address the provider accepted the message for.
 */
export function useSendTestEmail() {
  return useMutation({
    mutationFn: (id: number) =>
      api.post<{ sentTo: string }>(`/admin/email-templates/${id}/send-test`, {}),
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
