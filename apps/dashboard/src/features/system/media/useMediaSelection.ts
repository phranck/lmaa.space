import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useRef,
} from "react";

import type { MediaAsset, MediaFolder } from "@lmaa/shared";

export interface SelectionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type SelectionKind = "asset" | "folder";

export interface SelectionAnchor {
  kind: SelectionKind;
  id: number;
}

interface MediaSelectionStateUpdate {
  selectedAssetIds?: number[];
  selectedFolderIds?: number[];
  selectionAnchorId?: SelectionAnchor | null;
  selectionBox?: SelectionBox | null;
}

interface UseMediaSelectionOptions {
  assets: MediaAsset[];
  folders: MediaFolder[];
  deleteDialogOpen: boolean;
  selectedAssetIds: number[];
  selectedFolderIds: number[];
  selectedAssetIdSet: ReadonlySet<number>;
  selectedFolderIdSet: ReadonlySet<number>;
  selectionAnchorId: SelectionAnchor | null;
  updateSelectionState: (update: MediaSelectionStateUpdate) => void;
  ancestorsExist: boolean;
  onNavigateUp: () => void;
}

/**
 * Selection logic for the media manager grid.
 *
 * Supports two item kinds (assets and folders). Range-select operates only
 * within a single kind; cross-kind shift-clicks downgrade to a plain single
 * select. Cmd/Ctrl-click toggles individually and may mix kinds. Marquee
 * drag picks up both `[data-media-asset-id]` and `[data-media-folder-id]`
 * items inside the container. Right-click is ignored (button !== 0). The
 * Backspace key navigates to the parent folder when conditions allow.
 */
export function useMediaSelection({
  assets,
  folders,
  deleteDialogOpen,
  selectedAssetIds,
  selectedFolderIds,
  selectedAssetIdSet,
  selectedFolderIdSet,
  selectionAnchorId,
  updateSelectionState,
  ancestorsExist,
  onNavigateUp,
}: UseMediaSelectionOptions) {
  const selectionAreaRef = useRef<HTMLDivElement>(null);
  const selectionDragRef = useRef<{
    baseAssetIds: number[];
    baseFolderIds: number[];
    hasMoved: boolean;
    startX: number;
    startY: number;
  } | null>(null);
  const suppressNextAreaClickRef = useRef(false);

  function siblingIdsForKind(kind: SelectionKind): number[] {
    return kind === "asset" ? assets.map((a) => a.id) : folders.map((f) => f.id);
  }

  function sortIdsByOrder(ids: Iterable<number>, kind: SelectionKind): number[] {
    const orderIds = siblingIdsForKind(kind);
    const orderIndex = new Map(orderIds.map((id, index) => [id, index]));
    return Array.from(new Set(ids)).sort(
      (a, b) =>
        (orderIndex.get(a) ?? Number.MAX_SAFE_INTEGER) -
        (orderIndex.get(b) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  function getRangeSelection(kind: SelectionKind, anchorId: number, targetId: number): number[] {
    const orderIds = siblingIdsForKind(kind);
    const anchorIndex = orderIds.indexOf(anchorId);
    const targetIndex = orderIds.indexOf(targetId);
    if (anchorIndex < 0 || targetIndex < 0) return [targetId];
    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);
    return orderIds.slice(start, end + 1);
  }

  function handleSelectItem(
    target: { kind: SelectionKind; id: number },
    event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
  ) {
    const additive = event.metaKey || event.ctrlKey;

    if (event.shiftKey && selectionAnchorId && selectionAnchorId.kind === target.kind) {
      const rangeIds = getRangeSelection(target.kind, selectionAnchorId.id, target.id);
      const existingList = target.kind === "asset" ? selectedAssetIds : selectedFolderIds;
      const next = additive
        ? sortIdsByOrder([...existingList, ...rangeIds], target.kind)
        : rangeIds;
      updateSelectionState(
        target.kind === "asset" ? { selectedAssetIds: next } : { selectedFolderIds: next },
      );
      return;
    }

    if (additive) {
      const set = target.kind === "asset" ? selectedAssetIdSet : selectedFolderIdSet;
      const list = target.kind === "asset" ? selectedAssetIds : selectedFolderIds;
      const nextIds = set.has(target.id)
        ? list.filter((id) => id !== target.id)
        : sortIdsByOrder([...list, target.id], target.kind);
      updateSelectionState({
        ...(target.kind === "asset"
          ? { selectedAssetIds: nextIds }
          : { selectedFolderIds: nextIds }),
        selectionAnchorId: { kind: target.kind, id: target.id },
      });
      return;
    }

    updateSelectionState({
      selectedAssetIds: target.kind === "asset" ? [target.id] : [],
      selectedFolderIds: target.kind === "folder" ? [target.id] : [],
      selectionAnchorId: { kind: target.kind, id: target.id },
    });
  }

  function getSelectionBox(
    startX: number,
    startY: number,
    currentX: number,
    currentY: number,
  ): SelectionBox | null {
    const container = selectionAreaRef.current;
    if (!container) return null;
    const containerRect = container.getBoundingClientRect();
    const viewportLeft = Math.min(startX, currentX);
    const viewportTop = Math.min(startY, currentY);
    const viewportRight = Math.max(startX, currentX);
    const viewportBottom = Math.max(startY, currentY);
    return {
      left: viewportLeft - containerRect.left,
      top: viewportTop - containerRect.top,
      width: viewportRight - viewportLeft,
      height: viewportBottom - viewportTop,
    };
  }

  function getMarqueeSelectedIds(
    startX: number,
    startY: number,
    currentX: number,
    currentY: number,
  ): { assetIds: number[]; folderIds: number[] } {
    const container = selectionAreaRef.current;
    if (!container) return { assetIds: [], folderIds: [] };

    const selectionRect = {
      left: Math.min(startX, currentX),
      right: Math.max(startX, currentX),
      top: Math.min(startY, currentY),
      bottom: Math.max(startY, currentY),
    };
    const assetIds = new Set<number>();
    const folderIds = new Set<number>();

    for (const item of container.querySelectorAll<HTMLElement>(
      "[data-media-asset-id], [data-media-folder-id]",
    )) {
      const assetIdAttr = item.dataset.mediaAssetId;
      const folderIdAttr = item.dataset.mediaFolderId;
      const id = Number(assetIdAttr ?? folderIdAttr);
      if (!Number.isFinite(id)) continue;

      const itemRect = item.getBoundingClientRect();
      const overlaps =
        itemRect.left <= selectionRect.right &&
        itemRect.right >= selectionRect.left &&
        itemRect.top <= selectionRect.bottom &&
        itemRect.bottom >= selectionRect.top;
      if (!overlaps) continue;

      if (assetIdAttr !== undefined) assetIds.add(id);
      else folderIds.add(id);
    }

    return { assetIds: [...assetIds], folderIds: [...folderIds] };
  }

  function handleSelectionMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-media-asset-item], [data-media-folder-item]")) return;
    if (!selectionAreaRef.current?.contains(target)) return;

    const additive = event.metaKey || event.ctrlKey;
    selectionDragRef.current = {
      baseAssetIds: additive ? selectedAssetIds : [],
      baseFolderIds: additive ? selectedFolderIds : [],
      hasMoved: false,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.preventDefault();
    updateSelectionState({ selectionBox: null });

    function handleMouseMove(moveEvent: MouseEvent) {
      const drag = selectionDragRef.current;
      if (!drag) return;

      const distance = Math.hypot(moveEvent.clientX - drag.startX, moveEvent.clientY - drag.startY);
      if (distance < 4 && !drag.hasMoved) return;

      drag.hasMoved = true;
      const { assetIds, folderIds } = getMarqueeSelectedIds(
        drag.startX,
        drag.startY,
        moveEvent.clientX,
        moveEvent.clientY,
      );
      const nextAssetIds = sortIdsByOrder([...drag.baseAssetIds, ...assetIds], "asset");
      const nextFolderIds = sortIdsByOrder([...drag.baseFolderIds, ...folderIds], "folder");
      const lastAsset = assetIds.at(-1);
      const lastFolder = folderIds.at(-1);
      let anchor: SelectionAnchor | null = null;
      if (lastAsset !== undefined) anchor = { kind: "asset", id: lastAsset };
      else if (lastFolder !== undefined) anchor = { kind: "folder", id: lastFolder };
      else if (drag.baseAssetIds.length > 0)
        anchor = { kind: "asset", id: drag.baseAssetIds[drag.baseAssetIds.length - 1] };
      else if (drag.baseFolderIds.length > 0)
        anchor = { kind: "folder", id: drag.baseFolderIds[drag.baseFolderIds.length - 1] };

      updateSelectionState({
        selectedAssetIds: nextAssetIds,
        selectedFolderIds: nextFolderIds,
        selectionAnchorId: anchor,
        selectionBox: getSelectionBox(
          drag.startX,
          drag.startY,
          moveEvent.clientX,
          moveEvent.clientY,
        ),
      });
    }

    function handleMouseUp() {
      const drag = selectionDragRef.current;
      if (drag?.hasMoved) {
        suppressNextAreaClickRef.current = true;
      }
      selectionDragRef.current = null;
      updateSelectionState({ selectionBox: null });
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function handleMediaAreaClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (suppressNextAreaClickRef.current) {
      suppressNextAreaClickRef.current = false;
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-media-asset-item], [data-media-folder-item]")) return;
    updateSelectionState({
      selectedAssetIds: [],
      selectedFolderIds: [],
      selectionAnchorId: null,
    });
  }

  function handleSelectionAreaKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (deleteDialogOpen) return;

    if (event.key === "Escape") {
      updateSelectionState({
        selectedAssetIds: [],
        selectedFolderIds: [],
        selectionAnchorId: null,
      });
      return;
    }

    if (event.key === "Backspace" && ancestorsExist) {
      event.preventDefault();
      onNavigateUp();
    }
  }

  return {
    handleMediaAreaClick,
    handleSelectItem,
    handleSelectionAreaKeyDown,
    handleSelectionMouseDown,
    selectionAreaRef,
  };
}
