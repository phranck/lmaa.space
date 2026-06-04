import type { MediaFolder } from "@lmaa/shared";

export const MEDIA_ROOT_PATH = "/media";

export function mediaFolderPath(folderId: number) {
  return `${MEDIA_ROOT_PATH}/folder/${folderId}`;
}

export function mediaFolderHref(folder: MediaFolder) {
  return mediaFolderPath(folder.id);
}
