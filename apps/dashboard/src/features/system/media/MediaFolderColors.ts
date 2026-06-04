import type { MediaFolderColor } from "@lmaa/shared";

export const MEDIA_FOLDER_COLOR_OPTIONS: readonly MediaFolderColor[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "gray",
];

export const MEDIA_FOLDER_COLOR_VALUES: Record<MediaFolderColor, string> = {
  red: "#ff5f57",
  orange: "#ff9f43",
  yellow: "#ffd43b",
  green: "#51cf66",
  blue: "#19aeea",
  purple: "#cc5de8",
  gray: "#a6a8ad",
};

export const MEDIA_FOLDER_DEFAULT_COLOR: MediaFolderColor = "blue";

export function resolveMediaFolderColor(color: MediaFolderColor | null): string {
  return MEDIA_FOLDER_COLOR_VALUES[color ?? MEDIA_FOLDER_DEFAULT_COLOR];
}
