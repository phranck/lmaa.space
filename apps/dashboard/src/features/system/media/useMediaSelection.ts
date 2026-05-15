import {
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

import type { MediaAsset } from "@lmaa/shared";

export interface SelectionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface MediaSelectionStateUpdate {
  selectedIds?: number[];
  selectionAnchorId?: number | null;
  selectionBox?: SelectionBox | null;
}

interface UseMediaSelectionOptions {
  assets: MediaAsset[];
  deleteDialogOpen: boolean;
  selectedIds: number[];
  selectedIdSet: ReadonlySet<number>;
  selectionAnchorId: number | null;
  updateSelectionState: (update: MediaSelectionStateUpdate) => void;
}

export function useMediaSelection({
  assets,
  deleteDialogOpen,
  selectedIds,
  selectedIdSet,
  selectionAnchorId,
  updateSelectionState,
}: UseMediaSelectionOptions) {
  const selectionAreaRef = useRef<HTMLDivElement>(null);
  const selectionDragRef = useRef<{
    baseIds: number[];
    hasMoved: boolean;
    startX: number;
    startY: number;
  } | null>(null);
  const suppressNextAreaClickRef = useRef(false);

  function getCurrentOrderIds(visibleOrderIds?: number[]) {
    return visibleOrderIds && visibleOrderIds.length > 0
      ? visibleOrderIds
      : assets.map((asset) => asset.id);
  }

  function sortIdsByCurrentOrder(ids: Iterable<number>, visibleOrderIds?: number[]) {
    const orderIds = getCurrentOrderIds(visibleOrderIds);
    const orderIndex = new Map(orderIds.map((id, index) => [id, index]));
    return Array.from(new Set(ids)).sort(
      (a, b) =>
        (orderIndex.get(a) ?? Number.MAX_SAFE_INTEGER) -
        (orderIndex.get(b) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  function getRangeSelection(anchorId: number, targetId: number, visibleOrderIds?: number[]) {
    const orderIds = getCurrentOrderIds(visibleOrderIds);
    const anchorIndex = orderIds.indexOf(anchorId);
    const targetIndex = orderIds.indexOf(targetId);
    if (anchorIndex < 0 || targetIndex < 0) return [targetId];

    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);
    return orderIds.slice(start, end + 1);
  }

  function handleSelectAsset(
    id: number,
    event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
    visibleOrderIds?: number[],
  ) {
    const additive = event.metaKey || event.ctrlKey;

    if (event.shiftKey) {
      const anchorId = selectionAnchorId ?? selectedIds.at(-1) ?? id;
      const rangeIds = getRangeSelection(anchorId, id, visibleOrderIds);
      updateSelectionState({
        selectedIds: additive
          ? sortIdsByCurrentOrder([...selectedIds, ...rangeIds], visibleOrderIds)
          : rangeIds,
      });
      return;
    }

    if (additive) {
      const nextIds = selectedIdSet.has(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : sortIdsByCurrentOrder([...selectedIds, id], visibleOrderIds);
      updateSelectionState({ selectedIds: nextIds, selectionAnchorId: id });
      return;
    }

    updateSelectionState({ selectedIds: [id], selectionAnchorId: id });
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
  ) {
    const container = selectionAreaRef.current;
    if (!container) return [];

    const selectionRect = {
      left: Math.min(startX, currentX),
      right: Math.max(startX, currentX),
      top: Math.min(startY, currentY),
      bottom: Math.max(startY, currentY),
    };
    const selected = new Set<number>();

    for (const item of container.querySelectorAll<HTMLElement>("[data-media-asset-id]")) {
      const id = Number(item.dataset.mediaAssetId);
      if (!Number.isFinite(id)) continue;

      const itemRect = item.getBoundingClientRect();
      const overlaps =
        itemRect.left <= selectionRect.right &&
        itemRect.right >= selectionRect.left &&
        itemRect.top <= selectionRect.bottom &&
        itemRect.bottom >= selectionRect.top;
      if (overlaps) selected.add(id);
    }

    return Array.from(selected);
  }

  function handleSelectionMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-media-asset-item]")) return;
    if (!selectionAreaRef.current?.contains(target)) return;

    const additive = event.metaKey || event.ctrlKey;
    selectionDragRef.current = {
      baseIds: additive ? selectedIds : [],
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
      const selectedFromBox = getMarqueeSelectedIds(
        drag.startX,
        drag.startY,
        moveEvent.clientX,
        moveEvent.clientY,
      );
      updateSelectionState({
        selectedIds: sortIdsByCurrentOrder([...drag.baseIds, ...selectedFromBox]),
        selectionAnchorId: selectedFromBox.at(-1) ?? drag.baseIds.at(-1) ?? null,
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
    if (target.closest("[data-media-asset-item]")) return;
    updateSelectionState({ selectedIds: [], selectionAnchorId: null });
  }

  function handleSelectionAreaKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape" || deleteDialogOpen) return;
    updateSelectionState({ selectedIds: [], selectionAnchorId: null });
  }

  return {
    handleMediaAreaClick,
    handleSelectAsset,
    handleSelectionAreaKeyDown,
    handleSelectionMouseDown,
    selectionAreaRef,
  };
}
