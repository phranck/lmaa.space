import { useQuery } from "@tanstack/react-query";

import type { FolderContentsResponse } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

/**
 * Fetches the folder-scoped view used by both the Manager and the Picker.
 * Pass `null` for the root view.
 */
export function useFolderContents(folderId: number | null) {
  return useQuery({
    queryKey: ["media", "folder-contents", folderId] as const,
    queryFn: () => {
      const search = folderId === null ? "" : `?folderId=${folderId}`;
      return api.get<FolderContentsResponse>(`/admin/media/folder-contents${search}`);
    },
  });
}
