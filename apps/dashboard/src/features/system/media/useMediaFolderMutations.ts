import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { MediaAsset, MediaFolder, MediaFolderColor } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

interface CreateFolderInput {
  name: string;
  parentId: number | null;
  assetIds?: number[];
}

interface UpdateFolderInput {
  id: number;
  name?: string;
  parentId?: number | null;
  color?: MediaFolderColor | null;
}

interface MoveAssetInput {
  id: number;
  folderId: number | null;
}

/**
 * Mutation hooks for folder CRUD + asset moves. All mutations invalidate the
 * folder-contents query (Manager and Picker both consume it) and the global
 * `media-admin` query (sidebar counts, upload-conflict check).
 */
export function useMediaFolderMutations() {
  const qc = useQueryClient();

  const createFolder = useMutation({
    mutationFn: (input: CreateFolderInput) => api.post<MediaFolder>("/admin/media/folders", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media", "folder-contents"] });
      qc.invalidateQueries({ queryKey: ["media-admin"] });
    },
  });

  const renameFolder = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.patch<MediaFolder>(`/admin/media/folders/${id}`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media", "folder-contents"] });
      qc.invalidateQueries({ queryKey: ["media-admin"] });
    },
  });

  const moveFolder = useMutation({
    mutationFn: ({ id, parentId }: UpdateFolderInput) =>
      api.patch<MediaFolder>(`/admin/media/folders/${id}`, { parentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media", "folder-contents"] });
      qc.invalidateQueries({ queryKey: ["media-admin"] });
    },
  });

  const setFolderColor = useMutation({
    mutationFn: ({ id, color }: { id: number; color: MediaFolderColor | null }) =>
      api.patch<MediaFolder>(`/admin/media/folders/${id}`, { color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media", "folder-contents"] });
      qc.invalidateQueries({ queryKey: ["media-admin"] });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: (id: number) =>
      api.delete<{ deletedFolderCount: number; deletedAssetCount: number }>(
        `/admin/media/folders/${id}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media", "folder-contents"] });
      qc.invalidateQueries({ queryKey: ["media-admin"] });
    },
  });

  const moveAsset = useMutation({
    mutationFn: ({ id, folderId }: MoveAssetInput) =>
      api.patch<MediaAsset>(`/admin/media/${id}`, { folderId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media", "folder-contents"] });
      qc.invalidateQueries({ queryKey: ["media-admin"] });
    },
  });

  return { createFolder, renameFolder, moveFolder, setFolderColor, deleteFolder, moveAsset };
}
