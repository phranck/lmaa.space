import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AdminUser } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

type UiPreferences = NonNullable<AdminUser["uiPreferences"]>;

export function useUpdateUiPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prefs: UiPreferences) => api.patch<null>("/admin/me/preferences", prefs),
    onMutate: async (prefs) => {
      await queryClient.cancelQueries({ queryKey: ["auth", "me"] });
      queryClient.setQueryData<AdminUser>(["auth", "me"], (prev) =>
        prev ? { ...prev, uiPreferences: { ...prev.uiPreferences, ...prefs } } : prev,
      );
    },
  });
}
