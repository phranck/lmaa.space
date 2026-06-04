import type { MouseEvent as ReactMouseEvent } from "react";
import { useState } from "react";

import type { MediaContextMenuVariant } from "@/features/system/media/MediaContextMenu.tsx";

interface MediaContextMenuState {
  open: boolean;
  origin: { x: number; y: number } | null;
  variant: MediaContextMenuVariant;
}

interface UseMediaContextMenuOptions {
  selectedAssetIds: number[];
  selectedFolderIds: number[];
  setSelectionToAsset: (assetId: number) => void;
  setSelectionToFolder: (folderId: number) => void;
  clearSelection: () => void;
}

interface UseMediaContextMenuResult {
  state: MediaContextMenuState;
  openForAsset: (event: ReactMouseEvent, assetId: number) => void;
  openForFolder: (event: ReactMouseEvent, folderId: number) => void;
  openForEmpty: (event: ReactMouseEvent) => void;
  close: () => void;
}

const INITIAL_STATE: MediaContextMenuState = {
  open: false,
  origin: null,
  variant: "empty",
};

/**
 * Owns context-menu open state, origin coordinates and Finder-style
 * right-click selection sync. Supports assets and folders with the variant
 * matrix:
 *
 *  - Right-click unselected asset/folder → set selection to just that item,
 *    variant `single` or `folder`.
 *  - Right-click the sole selected item → keep selection, variant
 *    `single`/`folder`.
 *  - Right-click an item within a multi-selection → keep selection, variant
 *    `multi` (asset+folder mix counted via totalSelected > 1).
 *  - Right-click empty area → clear selection, variant `empty`.
 */
export function useMediaContextMenu({
  selectedAssetIds,
  selectedFolderIds,
  setSelectionToAsset,
  setSelectionToFolder,
  clearSelection,
}: UseMediaContextMenuOptions): UseMediaContextMenuResult {
  const [state, setState] = useState<MediaContextMenuState>(INITIAL_STATE);

  function openForAsset(event: ReactMouseEvent, assetId: number) {
    event.preventDefault();
    event.stopPropagation();

    const isInSelection = selectedAssetIds.includes(assetId);
    const totalSelected = selectedAssetIds.length + selectedFolderIds.length;
    const isMulti = isInSelection && totalSelected > 1;

    if (!isInSelection) setSelectionToAsset(assetId);

    setState({
      open: true,
      origin: { x: event.clientX, y: event.clientY },
      variant: isMulti ? "multi" : "single",
    });
  }

  function openForFolder(event: ReactMouseEvent, folderId: number) {
    event.preventDefault();
    event.stopPropagation();

    const isInSelection = selectedFolderIds.includes(folderId);
    const totalSelected = selectedAssetIds.length + selectedFolderIds.length;
    const isMulti = isInSelection && totalSelected > 1;

    if (!isInSelection) setSelectionToFolder(folderId);

    setState({
      open: true,
      origin: { x: event.clientX, y: event.clientY },
      variant: isMulti ? "multi" : "folder",
    });
  }

  function openForEmpty(event: ReactMouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    clearSelection();
    setState({
      open: true,
      origin: { x: event.clientX, y: event.clientY },
      variant: "empty",
    });
  }

  function close() {
    setState((prev) => ({ ...prev, open: false }));
  }

  return { state, openForAsset, openForFolder, openForEmpty, close };
}
