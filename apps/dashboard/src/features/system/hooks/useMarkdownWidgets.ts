import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MarkdownWidgetsConfig } from "@lmaa/contracts";

import { api } from "@/lib/api.ts";

const QUERY_KEY = ["admin-markdown-widgets"];

export function useMarkdownWidgets() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<MarkdownWidgetsConfig>("/admin/markdown-widgets"),
  });
}

export function useSaveMarkdownWidgets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: MarkdownWidgetsConfig) =>
      api.put<MarkdownWidgetsConfig>("/admin/markdown-widgets", config),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
