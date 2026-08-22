import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SupportPrompt, SupportPromptInput, SupportPromptLimits } from "@lmaa/contracts";

import { api } from "@/lib/api.ts";

/** Every prompt, published or not, for the list in the dashboard. */
export function useSupportPrompts() {
  return useQuery({
    queryKey: ["support-prompts"],
    queryFn: () => api.get<SupportPrompt[]>("/admin/support-prompts"),
    staleTime: 30 * 1000,
  });
}

/** What bounds one reader across every prompt together. */
export function useSupportPromptLimits() {
  return useQuery({
    queryKey: ["support-prompt-limits"],
    queryFn: () => api.get<SupportPromptLimits>("/admin/support-prompts/limits"),
    staleTime: 30 * 1000,
  });
}

/** Stores the limits. */
export function useSaveSupportPromptLimits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (limits: SupportPromptLimits) =>
      api.put<SupportPromptLimits>("/admin/support-prompts/limits", limits),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-prompt-limits"] }),
  });
}

/** Creates a prompt and returns it with the identifier it was given. */
export function useCreateSupportPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SupportPromptInput) =>
      api.post<SupportPrompt>("/admin/support-prompts", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-prompts"] }),
  });
}

/** Saves one prompt. The identifier never changes, so nobody's counters reset. */
export function useSaveSupportPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupportPromptInput }) =>
      api.put<SupportPrompt>(`/admin/support-prompts/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-prompts"] }),
  });
}

/** Removes one prompt. */
export function useDeleteSupportPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/admin/support-prompts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-prompts"] }),
  });
}
