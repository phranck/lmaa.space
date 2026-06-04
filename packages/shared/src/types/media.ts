/**
 * Maximum upload size for dashboard-managed media assets.
 *
 * The backend currently buffers uploads before storing them in object storage,
 * so this limit must stay finite and explicit.
 */
export const MEDIA_UPLOAD_MAX_BYTES = 256 * 1024 * 1024;

/**
 * User-facing maximum upload size label.
 */
export const MEDIA_UPLOAD_MAX_LABEL = "256 MB";

/**
 * File input accept list for dashboard-managed media assets.
 */
export const MEDIA_UPLOAD_ACCEPT =
  "image/*,video/mp4,.pdf,.txt,.md,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4";

/**
 * MIME type used for HLS media playlists.
 */
export const HLS_MANIFEST_MIME_TYPE = "application/vnd.apple.mpegurl";

/**
 * MIME type used for MPEG-TS HLS media segments.
 */
export const HLS_SEGMENT_MIME_TYPE = "video/mp2t";

/**
 * Supported media buckets shown in the dashboard media library.
 */
export type MediaKind = "image" | "document" | "video";

/**
 * Stored media asset metadata shared between backend and dashboard.
 */
export type MediaFolderColor = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "gray";

/**
 * Stored media folder metadata shared between backend and dashboard.
 */
export interface MediaFolder {
  id: number;
  name: string;
  parentId: number | null;
  color: MediaFolderColor | null;
  itemCount: number;
  sizeBytes: number;
  systemKey: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
}

/**
 * Folder-scoped media manager response.
 */
export interface FolderContentsResponse {
  folder: MediaFolder | null;
  ancestors: MediaFolder[];
  folders: MediaFolder[];
  assets: MediaAsset[];
}

/**
 * Stored media asset metadata shared between backend and dashboard.
 */
export interface MediaAsset {
  id: number;
  displayName: string;
  originalName: string;
  storedFilename: string;
  alias: string | null;
  mimeType: string;
  kind: MediaKind;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  folderId: number | null;
  url: string;
  posterUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUsername: string | null;
}
