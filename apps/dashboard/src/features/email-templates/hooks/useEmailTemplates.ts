import { api } from "@/lib/api.ts";
import type { EmailTemplate, EmailTemplateInput } from "@lmaa/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
