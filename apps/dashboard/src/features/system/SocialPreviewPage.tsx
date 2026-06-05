import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowSquareOutIcon,
  ArrowsHorizontalIcon,
  ArrowsOutLineHorizontalIcon,
  ArrowsOutLineVerticalIcon,
  ArrowsVerticalIcon,
  FileTextIcon,
  BoundingBoxIcon,
  CheckCircleIcon,
  CircleHalfIcon,
  CircleIcon,
  CornersOutIcon,
  CopyIcon,
  DropIcon,
  EyeIcon,
  EyeSlashIcon,
  HexagonIcon,
  ImageIcon,
  ImagesIcon,
  LockKeyIcon,
  LockKeyOpenIcon,
  PaletteIcon,
  PencilSimpleIcon,
  PlusIcon,
  PolygonIcon,
  RectangleIcon,
  RulerIcon,
  SelectionIcon,
  SunDimIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  StarIcon,
  TextBIcon,
  TextItalicIcon,
  TextTIcon,
  TextUnderlineIcon,
  TrashIcon,
  VectorTwoIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";

import type {
  SocialPreviewComposition,
  SocialPreviewFormat,
  SocialPreviewImageEntry,
  SocialPreviewImageLayer,
  SocialPreviewLayer,
  SocialPreviewProjectEntry,
  SocialPreviewShapeKind,
  SocialPreviewShapeLayer,
  SocialPreviewTextLayer,
} from "@lmaa/contracts";
import type { MediaAsset } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  CancelActionButton,
  CopyActionButton,
  CreateActionButton,
  DeleteActionButton,
  SaveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { DashboardInput } from "@/components/ui/DashboardControls.tsx";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { PageFooter } from "@/components/ui/PageFooter.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { SubMenu } from "@/components/ui/SubMenu.tsx";
import { DataTable, type ColumnDef } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { UnsplashBrowser } from "@/components/ui/UnsplashBrowser.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAdminMedia } from "@/features/system/hooks/useAdminMedia.ts";
import {
  useCreateSocialPreviewImage,
  useCreateSocialPreviewProject,
  useDeleteSocialPreviewImage,
  useImportRemoteSocialPreviewAsset,
  useDeleteSocialPreviewProject,
  useSetActiveSocialPreviewImage,
  useSetDefaultSocialPreviewImage,
  useSocialPreviewImages,
  useUpdateSocialPreviewImage,
  useSocialPreviewProjects,
  useUpdateSocialPreviewProject,
  useUploadSocialPreviewAsset,
} from "@/features/system/hooks/useSocialPreviewImages.ts";
import { isImageAsset } from "@/features/system/media/media-utils.ts";
import { MediaGridItem } from "@/features/system/media/MediaGridItem.tsx";
import {
  createEmptySocialPreviewComposition,
  createImageLayer,
  createShapeLayer,
  createTextLayer,
  formatBytes,
  renderSocialPreviewBlob,
} from "@/features/system/social-preview-renderer.ts";
import { FRONTEND_URL } from "@/lib/env.ts";

import "./social-preview-fonts.css";

const FONT_OPTIONS = [
  { value: "Antonio", label: "Antonio" },
  { value: "Audiowide", label: "Audiowide" },
  { value: "Barlow", label: "Barlow" },
  { value: "Barlow Condensed", label: "Barlow Condensed" },
  { value: "Barlow Semi Condensed", label: "Barlow Semi Condensed" },
  { value: "Corinthia", label: "Corinthia" },
  { value: "Dosis", label: "Dosis" },
  { value: "DynaPuff", label: "DynaPuff" },
  { value: "Fira Code", label: "Fira Code" },
  { value: "Inter", label: "Inter" },
  { value: "Nunito", label: "Nunito" },
  { value: "Orbitron", label: "Orbitron" },
  { value: "Roboto", label: "Roboto" },
  { value: "Roboto Condensed", label: "Roboto Condensed" },
  { value: "Roboto Flex", label: "Roboto Flex" },
  { value: "Sacramento", label: "Sacramento" },
];

const FORMAT_OPTIONS: Array<{ value: SocialPreviewFormat; label: string }> = [
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/webp", label: "WebP" },
  { value: "image/png", label: "PNG" },
];

function getSocialPreviewVersion(image: SocialPreviewImageEntry) {
  return `${image.id}-${new Date(image.updatedAt).getTime()}`;
}

function getSocialPreviewShareUrl(image: SocialPreviewImageEntry) {
  const url = new URL(FRONTEND_URL);
  url.searchParams.set("preview", getSocialPreviewVersion(image));
  return url.href;
}

const RESIZE_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
type ResizeHandle = (typeof RESIZE_HANDLES)[number];
const RESIZE_HANDLE_CURSOR_CLASSES: Record<ResizeHandle, string> = {
  n: "cursor-ns-resize",
  s: "cursor-ns-resize",
  e: "cursor-ew-resize",
  w: "cursor-ew-resize",
  ne: "cursor-nesw-resize",
  sw: "cursor-nesw-resize",
  nw: "cursor-nwse-resize",
  se: "cursor-nwse-resize",
};

type SelectionTarget = { type: "layer"; id: string } | null;
type ActiveTool = "text" | "image" | "shape";

type DragState =
  | {
      mode: "layer-move";
      id: string;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    }
  | {
      mode: "layer-resize";
      id: string;
      handle: ResizeHandle;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
      originWidth: number;
      originHeight: number;
      originRadius?: number;
    }
  | {
      mode: "layer-rotate";
      id: string;
      centerX: number;
      centerY: number;
      startAngle: number;
      originRotation: number;
    };

interface GuideLine {
  axis: "x" | "y";
  position: number;
}

interface TextSelectionRange {
  layerId: string;
  start: number;
  end: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function getImageZoom(layer: SocialPreviewImageLayer) {
  return layer.zoom ?? 1;
}

function getImageOffsetX(layer: SocialPreviewImageLayer) {
  return layer.offsetX ?? 0;
}

function getImageOffsetY(layer: SocialPreviewImageLayer) {
  return layer.offsetY ?? 0;
}

function getImageTintColor(layer: SocialPreviewImageLayer) {
  return layer.tintColor ?? "#ffffff";
}

function getImageTintOpacity(layer: SocialPreviewImageLayer) {
  return layer.tintOpacity ?? 0;
}

function getImageBrightness(layer: SocialPreviewImageLayer) {
  return layer.brightness ?? 1;
}

function getImageContrast(layer: SocialPreviewImageLayer) {
  return layer.contrast ?? 1;
}

function getImageFilter(layer: SocialPreviewImageLayer) {
  return `brightness(${getImageBrightness(layer)}) contrast(${getImageContrast(layer)})`;
}

type TextStylePatch = Partial<
  Pick<
    SocialPreviewTextLayer,
    | "fontFamily"
    | "fontSize"
    | "fontWeight"
    | "fontStyle"
    | "textDecoration"
    | "color"
    | "lineHeight"
    | "letterSpacing"
  >
>;
type TextStyleRange = NonNullable<SocialPreviewTextLayer["styleRanges"]>[number];
type TextToggleState = "on" | "off" | "mixed";

const TEXT_STYLE_KEYS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "textDecoration",
  "color",
  "lineHeight",
  "letterSpacing",
] as const satisfies ReadonlyArray<keyof TextStylePatch>;

function getTextStyleAt(layer: SocialPreviewTextLayer, index: number) {
  const style = {
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize,
    fontWeight: layer.fontWeight,
    fontStyle: layer.fontStyle,
    textDecoration: layer.textDecoration ?? "none",
    color: layer.color,
    lineHeight: layer.lineHeight,
    letterSpacing: layer.letterSpacing,
  };

  const legacyColorRange = layer.colorRanges?.find(
    (entry) => index >= entry.start && index < entry.end,
  );
  if (legacyColorRange) {
    style.color = legacyColorRange.color;
  }

  for (const range of layer.styleRanges ?? []) {
    if (index < range.start || index >= range.end) continue;
    if (range.fontFamily !== undefined) style.fontFamily = range.fontFamily;
    if (range.fontSize !== undefined) style.fontSize = range.fontSize;
    if (range.fontWeight !== undefined) style.fontWeight = range.fontWeight;
    if (range.fontStyle !== undefined) style.fontStyle = range.fontStyle;
    if (range.textDecoration !== undefined) style.textDecoration = range.textDecoration;
    if (range.color !== undefined) style.color = range.color;
    if (range.lineHeight !== undefined) style.lineHeight = range.lineHeight;
    if (range.letterSpacing !== undefined) style.letterSpacing = range.letterSpacing;
  }

  return style;
}

function getTextSelectionBounds(
  layer: SocialPreviewTextLayer,
  textSelection: TextSelectionRange | null | undefined,
) {
  if (textSelection?.layerId !== layer.id || textSelection.start === textSelection.end) return null;
  return {
    start: clamp(Math.min(textSelection.start, textSelection.end), 0, layer.text.length),
    end: clamp(Math.max(textSelection.start, textSelection.end), 0, layer.text.length),
  };
}

function renderTextWithStyleRanges(
  layer: SocialPreviewTextLayer,
  textSelection?: TextSelectionRange | null,
) {
  const selectionBounds = getTextSelectionBounds(layer, textSelection);

  return Array.from(layer.text).map((char, index) => {
    const style = getTextStyleAt(layer, index);
    const selected =
      selectionBounds !== null && index >= selectionBounds.start && index < selectionBounds.end;
    return (
      <span
        key={`${index}-${char}`}
        style={{
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          fontStyle: style.fontStyle,
          textDecoration: style.textDecoration,
          color: style.color,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          backgroundColor: selected ? "rgba(56, 189, 248, 0.38)" : undefined,
        }}
      >
        {char}
      </span>
    );
  });
}

function hasTextStylePatch(patch: Partial<SocialPreviewLayer>): patch is TextStylePatch {
  return TEXT_STYLE_KEYS.some((key) => key in patch);
}

function pickTextStylePatch(patch: Partial<SocialPreviewLayer>): TextStylePatch {
  const stylePatch: TextStylePatch = {};
  const patchRecord = patch as Record<string, unknown>;
  const styleRecord = stylePatch as Record<string, unknown>;
  for (const key of TEXT_STYLE_KEYS) {
    if (key in patchRecord) {
      styleRecord[key] = patchRecord[key];
    }
  }
  return stylePatch;
}

function getTextStylePatchKeys(patch: TextStylePatch) {
  return TEXT_STYLE_KEYS.filter((key) => key in patch);
}

function getTextToggleState(
  layer: SocialPreviewTextLayer,
  start: number,
  end: number,
  isActive: (style: ReturnType<typeof getTextStyleAt>) => boolean,
): TextToggleState {
  const safeStart = clamp(Math.min(start, end), 0, layer.text.length);
  const safeEnd = clamp(Math.max(start, end), 0, layer.text.length);
  if (safeStart === safeEnd) return isActive(getTextStyleAt(layer, safeStart)) ? "on" : "off";

  let activeCount = 0;
  for (let index = safeStart; index < safeEnd; index++) {
    if (isActive(getTextStyleAt(layer, index))) activeCount += 1;
  }

  if (activeCount === 0) return "off";
  if (activeCount === safeEnd - safeStart) return "on";
  return "mixed";
}

function getTextSelectionStyleState(
  layer: SocialPreviewTextLayer,
  textSelection: TextSelectionRange | null,
) {
  const hasRangeSelection =
    textSelection?.layerId === layer.id && textSelection.start !== textSelection.end;
  const selectionStart = hasRangeSelection
    ? clamp(Math.min(textSelection.start, textSelection.end), 0, layer.text.length)
    : null;
  const style =
    selectionStart !== null
      ? getTextStyleAt(layer, selectionStart)
      : {
          fontFamily: layer.fontFamily,
          fontSize: layer.fontSize,
          fontWeight: layer.fontWeight,
          fontStyle: layer.fontStyle,
          textDecoration: layer.textDecoration ?? "none",
          color: layer.color,
          lineHeight: layer.lineHeight,
          letterSpacing: layer.letterSpacing,
        };

  if (!hasRangeSelection) {
    return {
      style,
      fontWeight: style.fontWeight === "700" ? "on" : "off",
      fontStyle: style.fontStyle === "italic" ? "on" : "off",
      textDecoration: style.textDecoration === "underline" ? "on" : "off",
    };
  }

  return {
    style,
    fontWeight: getTextToggleState(
      layer,
      textSelection.start,
      textSelection.end,
      (entry) => entry.fontWeight === "700",
    ),
    fontStyle: getTextToggleState(
      layer,
      textSelection.start,
      textSelection.end,
      (entry) => entry.fontStyle === "italic",
    ),
    textDecoration: getTextToggleState(
      layer,
      textSelection.start,
      textSelection.end,
      (entry) => entry.textDecoration === "underline",
    ),
  };
}

function hasStyleRangeOverrides(range: TextStyleRange) {
  return TEXT_STYLE_KEYS.some((key) => range[key] !== undefined);
}

function applyTextStyleRange(
  layer: SocialPreviewTextLayer,
  start: number,
  end: number,
  patch: TextStylePatch,
): SocialPreviewTextLayer {
  const safeStart = clamp(Math.min(start, end), 0, layer.text.length);
  const safeEnd = clamp(Math.max(start, end), 0, layer.text.length);
  if (safeStart === safeEnd) return layer;

  const patchKeys = getTextStylePatchKeys(patch);
  const retainedRanges: TextStyleRange[] = [];

  for (const range of layer.styleRanges ?? []) {
    if (range.end <= safeStart || range.start >= safeEnd) {
      retainedRanges.push(range);
      continue;
    }

    if (range.start < safeStart) {
      retainedRanges.push({ ...range, end: safeStart });
    }

    const overlapRange = {
      ...range,
      start: Math.max(range.start, safeStart),
      end: Math.min(range.end, safeEnd),
    };
    for (const key of patchKeys) {
      delete overlapRange[key];
    }
    if (hasStyleRangeOverrides(overlapRange)) {
      retainedRanges.push(overlapRange);
    }

    if (range.end > safeEnd) {
      retainedRanges.push({ ...range, start: safeEnd });
    }
  }

  return {
    ...layer,
    styleRanges: [
      ...retainedRanges,
      {
        start: safeStart,
        end: safeEnd,
        ...patch,
      },
    ].slice(-400),
  };
}

function applyTextStyleToWholeLayer(
  layer: SocialPreviewTextLayer,
  patch: TextStylePatch,
): SocialPreviewTextLayer {
  const patchKeys = getTextStylePatchKeys(patch);
  if (patchKeys.length === 0) return layer;

  const styleRanges = (layer.styleRanges ?? [])
    .map((range) => {
      const nextRange = { ...range };
      for (const key of patchKeys) {
        delete nextRange[key];
      }
      return nextRange;
    })
    .filter(hasStyleRangeOverrides);

  return {
    ...layer,
    ...patch,
    colorRanges: patchKeys.includes("color") ? [] : layer.colorRanges,
    styleRanges,
  };
}

function updateLayer(
  composition: SocialPreviewComposition,
  layerId: string,
  patch: Partial<SocialPreviewLayer>,
): SocialPreviewComposition {
  return {
    ...composition,
    layers: composition.layers.map((layer) =>
      layer.id === layerId ? ({ ...layer, ...patch } as SocialPreviewLayer) : layer,
    ),
  };
}

function removeLayer(
  composition: SocialPreviewComposition,
  layerId: string,
): SocialPreviewComposition {
  return { ...composition, layers: composition.layers.filter((layer) => layer.id !== layerId) };
}

function isLayerLocked(layer: SocialPreviewLayer | null | undefined) {
  return layer?.locked === true;
}

function isLayerHidden(layer: SocialPreviewLayer | null | undefined) {
  return layer?.hidden === true;
}

function getLayerLabel(layer: SocialPreviewLayer) {
  if (layer.name?.trim()) return layer.name.trim();
  if (layer.type === "text") return layer.text.trim() || "Text";
  if (layer.type === "image") return layer.alt?.trim() || "Image";
  return layer.shape;
}

function migrateBaseImageToLayer(composition: SocialPreviewComposition): SocialPreviewComposition {
  const backgroundSrc = composition.background.src;
  if (!backgroundSrc) return composition;
  const background = composition.background;
  const baseLayer = createImageLayer(backgroundSrc, background.name ?? "Base Image");
  baseLayer.id = "base-image";
  baseLayer.name = background.name?.trim() || "Base Image";
  baseLayer.x = 0;
  baseLayer.y = 0;
  baseLayer.width = composition.width;
  baseLayer.height = composition.height;
  baseLayer.zoom = background.zoom;
  baseLayer.offsetX = background.offsetX;
  baseLayer.offsetY = background.offsetY;
  baseLayer.hidden = background.hidden;

  return {
    ...composition,
    background: {
      ...background,
      src: null,
      hidden: undefined,
      name: undefined,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    },
    layers: [baseLayer, ...composition.layers],
  };
}

function reorderLayerInPanel(
  composition: SocialPreviewComposition,
  draggedLayerId: string,
  targetLayerId: string,
  position: "before" | "after",
): SocialPreviewComposition {
  if (draggedLayerId === targetLayerId) return composition;

  const panelLayers = [...composition.layers].reverse();
  const draggedIndex = panelLayers.findIndex((layer) => layer.id === draggedLayerId);
  const targetIndex = panelLayers.findIndex((layer) => layer.id === targetLayerId);
  if (draggedIndex < 0 || targetIndex < 0) return composition;

  const [draggedLayer] = panelLayers.splice(draggedIndex, 1);
  const nextTargetIndex = panelLayers.findIndex((layer) => layer.id === targetLayerId);
  const insertIndex = position === "after" ? nextTargetIndex + 1 : nextTargetIndex;
  panelLayers.splice(insertIndex, 0, draggedLayer);

  return { ...composition, layers: panelLayers.reverse() };
}

function snapLayer(
  composition: SocialPreviewComposition,
  active: SocialPreviewLayer,
  x: number,
  y: number,
): { x: number; y: number; guides: GuideLine[] } {
  const threshold = 8;
  const guides: GuideLine[] = [];
  let nextX = x;
  let nextY = y;

  const xAnchors = [0, composition.width / 2, composition.width];
  const yAnchors = [0, composition.height / 2, composition.height];
  for (const layer of composition.layers) {
    if (layer.id === active.id) continue;
    xAnchors.push(layer.x, layer.x + layer.width / 2, layer.x + layer.width);
    yAnchors.push(layer.y, layer.y + layer.height / 2, layer.y + layer.height);
  }

  const movingX = [
    { value: nextX, offset: 0 },
    { value: nextX + active.width / 2, offset: active.width / 2 },
    { value: nextX + active.width, offset: active.width },
  ];
  const movingY = [
    { value: nextY, offset: 0 },
    { value: nextY + active.height / 2, offset: active.height / 2 },
    { value: nextY + active.height, offset: active.height },
  ];

  for (const anchor of xAnchors) {
    const match = movingX.find((entry) => Math.abs(entry.value - anchor) <= threshold);
    if (match) {
      nextX = anchor - match.offset;
      guides.push({ axis: "x", position: anchor });
      break;
    }
  }

  for (const anchor of yAnchors) {
    const match = movingY.find((entry) => Math.abs(entry.value - anchor) <= threshold);
    if (match) {
      nextY = anchor - match.offset;
      guides.push({ axis: "y", position: anchor });
      break;
    }
  }

  return { x: nextX, y: nextY, guides };
}

function renderLayerStyle(layer: SocialPreviewLayer): CSSProperties {
  return {
    left: layer.x,
    top: layer.y,
    width: layer.width,
    height: layer.height,
    opacity: layer.opacity,
    transform: `rotate(${layer.rotation}deg)`,
  };
}

function getPointerPosition(event: React.PointerEvent<HTMLElement>, stage: HTMLElement) {
  const rect = stage.getBoundingClientRect();
  const scaleX = 1200 / rect.width;
  const scaleY = 630 / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function getPointerAngle(
  event: React.PointerEvent<HTMLElement>,
  stage: HTMLElement,
  x: number,
  y: number,
) {
  const position = getPointerPosition(event, stage);
  return (Math.atan2(position.y - y, position.x - x) * 180) / Math.PI;
}

function loadImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error(`Image could not be loaded: ${src}`));
    image.src = src;
  });
}

function isCornerHandle(handle: ResizeHandle) {
  return handle.length === 2;
}

function resizeLayer(
  layer: SocialPreviewLayer,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
  proportional = false,
) {
  let x = layer.x;
  let y = layer.y;
  let width = layer.width;
  let height = layer.height;

  if (handle.includes("e")) width += deltaX;
  if (handle.includes("s")) height += deltaY;
  if (handle.includes("w")) {
    x += deltaX;
    width -= deltaX;
  }
  if (handle.includes("n")) {
    y += deltaY;
    height -= deltaY;
  }

  if (proportional && isCornerHandle(handle)) {
    const aspectRatio = layer.width / layer.height;
    const widthChange = Math.abs(width - layer.width) / layer.width;
    const heightChange = Math.abs(height - layer.height) / layer.height;
    if (widthChange >= heightChange) {
      height = Math.max(1, width / aspectRatio);
    } else {
      width = Math.max(1, height * aspectRatio);
    }

    if (handle.includes("w")) {
      x = layer.x + layer.width - width;
    }
    if (handle.includes("n")) {
      y = layer.y + layer.height - height;
    }
  }

  const minSize = 24;
  if (width < minSize) {
    if (handle.includes("w")) x -= minSize - width;
    width = minSize;
  }
  if (height < minSize) {
    if (handle.includes("n")) y -= minSize - height;
    height = minSize;
  }

  return { x, y, width, height };
}

function getResizedShapeRadius(
  layer: SocialPreviewShapeLayer,
  patch: { width: number; height: number },
  originWidth: number,
  originHeight: number,
  originRadius: number,
) {
  if (layer.shape !== "circle" && layer.shape !== "polygon" && layer.shape !== "star") {
    return undefined;
  }

  const scale = Math.min(patch.width / originWidth, patch.height / originHeight);
  return Math.max(1, originRadius * scale);
}

function snapResizeLayer(
  composition: SocialPreviewComposition,
  active: SocialPreviewLayer,
  handle: ResizeHandle,
  patch: { x: number; y: number; width: number; height: number },
): { patch: { x: number; y: number; width: number; height: number }; guides: GuideLine[] } {
  const threshold = 8;
  const guides: GuideLine[] = [];
  const next = { ...patch };
  const minSize = 24;
  const xAnchors = [0, composition.width / 2, composition.width];
  const yAnchors = [0, composition.height / 2, composition.height];

  for (const layer of composition.layers) {
    if (layer.id === active.id) continue;
    xAnchors.push(layer.x, layer.x + layer.width / 2, layer.x + layer.width);
    yAnchors.push(layer.y, layer.y + layer.height / 2, layer.y + layer.height);
  }

  if (handle.includes("w")) {
    const left = next.x;
    const anchor = xAnchors.find((entry) => Math.abs(entry - left) <= threshold);
    if (anchor !== undefined) {
      const right = next.x + next.width;
      next.x = Math.min(anchor, right - minSize);
      next.width = right - next.x;
      guides.push({ axis: "x", position: anchor });
    }
  }

  if (handle.includes("e")) {
    const right = next.x + next.width;
    const anchor = xAnchors.find((entry) => Math.abs(entry - right) <= threshold);
    if (anchor !== undefined) {
      next.width = Math.max(minSize, anchor - next.x);
      guides.push({ axis: "x", position: anchor });
    }
  }

  if (handle.includes("n")) {
    const top = next.y;
    const anchor = yAnchors.find((entry) => Math.abs(entry - top) <= threshold);
    if (anchor !== undefined) {
      const bottom = next.y + next.height;
      next.y = Math.min(anchor, bottom - minSize);
      next.height = bottom - next.y;
      guides.push({ axis: "y", position: anchor });
    }
  }

  if (handle.includes("s")) {
    const bottom = next.y + next.height;
    const anchor = yAnchors.find((entry) => Math.abs(entry - bottom) <= threshold);
    if (anchor !== undefined) {
      next.height = Math.max(minSize, anchor - next.y);
      guides.push({ axis: "y", position: anchor });
    }
  }

  return { patch: next, guides };
}

function formatRotation(value: number) {
  const normalized = value % 360;
  return Math.round(normalized < 0 ? normalized + 360 : normalized);
}

export function SocialPreviewPage() {
  const location = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  if (location.pathname === "/system/social-preview/images") {
    return <SocialPreviewImagesPage />;
  }
  if (!projectId) return <SocialPreviewOverviewPage />;

  const numericProjectId = Number(projectId);
  if (!Number.isInteger(numericProjectId) || numericProjectId <= 0) {
    return <Navigate to="/system/social-preview" replace />;
  }

  return <SocialPreviewEditorPage projectId={numericProjectId} />;
}

function SocialPreviewEditorPage({ projectId }: { projectId: number }) {
  const { messages } = useI18n();
  const t = messages.system.socialPreview;
  const common = messages.common;

  const { data: savedProjects = [], isLoading: isLoadingProjects } = useSocialPreviewProjects();
  const project = useMemo(
    () => savedProjects.find((entry) => entry.id === projectId) ?? null,
    [projectId, savedProjects],
  );
  const updateProject = useUpdateSocialPreviewProject();
  const uploadPreview = useUploadSocialPreviewAsset();
  const importRemotePreviewAsset = useImportRemoteSocialPreviewAsset();
  const createPreview = useCreateSocialPreviewImage();
  const { data: mediaAssets = [], isLoading: isLoadingMediaAssets } = useAdminMedia();

  const [composition, setComposition] = useState<SocialPreviewComposition>(() =>
    createEmptySocialPreviewComposition(),
  );
  const [selection, setSelection] = useState<SelectionTarget>(null);
  const [activeTool, setActiveTool] = useState<ActiveTool>("image");
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);
  const [textSelection, setTextSelection] = useState<TextSelectionRange | null>(null);
  const [browserMode, setBrowserMode] = useState<"layer" | null>(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [format, setFormat] = useState<SocialPreviewFormat>("image/jpeg");
  const [quality, setQuality] = useState(90);
  const targetSizeKb = 350;
  const [projectName, setProjectName] = useState("");
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [effectiveQuality, setEffectiveQuality] = useState(90);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [layerSidebarWidth, setLayerSidebarWidth] = useState(() => {
    const stored = window.localStorage.getItem("social-preview-layer-sidebar-width");
    const value = stored ? Number(stored) : 224;
    return Number.isFinite(value) ? clamp(value, 180, 360) : 224;
  });

  const stageRef = useRef<HTMLDivElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const loadedProjectIdRef = useRef<number | null>(null);
  const historyRef = useRef<SocialPreviewComposition[]>([]);
  const futureRef = useRef<SocialPreviewComposition[]>([]);
  const textClickRef = useRef<{ id: string; x: number; y: number; at: number } | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const selectedLayer = useMemo(
    () =>
      selection?.type === "layer"
        ? (composition.layers.find((layer) => layer.id === selection.id) ?? null)
        : null,
    [composition.layers, selection],
  );
  const selectedLayerLocked = isLayerLocked(selectedLayer);
  const canUndo = historyRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  const imageAssets = useMemo(() => mediaAssets.filter(isImageAsset), [mediaAssets]);
  void historyVersion;

  function pushHistorySnapshot(snapshot = composition) {
    historyRef.current = [...historyRef.current.slice(-49), snapshot];
    futureRef.current = [];
    setHistoryVersion((current) => current + 1);
  }

  function commitComposition(
    updater: (current: SocialPreviewComposition) => SocialPreviewComposition,
  ) {
    setComposition((current) => {
      historyRef.current = [...historyRef.current.slice(-49), current];
      futureRef.current = [];
      return updater(current);
    });
    setHistoryVersion((current) => current + 1);
  }

  function undoComposition() {
    const previous = historyRef.current.at(-1);
    if (!previous) return;
    setComposition((current) => {
      futureRef.current = [current, ...futureRef.current.slice(0, 49)];
      return previous;
    });
    historyRef.current = historyRef.current.slice(0, -1);
    setSelection(null);
    setEditingTextLayerId(null);
    setHistoryVersion((current) => current + 1);
  }

  function redoComposition() {
    const next = futureRef.current[0];
    if (!next) return;
    setComposition((current) => {
      historyRef.current = [...historyRef.current.slice(-49), current];
      return next;
    });
    futureRef.current = futureRef.current.slice(1);
    setSelection(null);
    setEditingTextLayerId(null);
    setHistoryVersion((current) => current + 1);
  }

  useEffect(() => {
    window.localStorage.setItem("social-preview-layer-sidebar-width", String(layerSidebarWidth));
  }, [layerSidebarWidth]);

  useEffect(() => {
    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelection(null);
        setEditingTextLayerId(null);
        setTextSelection(null);
        setDragState(null);
        setGuides([]);
        return;
      }

      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z";
      if (isUndo) {
        event.preventDefault();
        if (event.shiftKey) {
          redoComposition();
        } else {
          undoComposition();
        }
        return;
      }

      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        selectedLayer &&
        !selectedLayerLocked
      ) {
        const target = event.target;
        const isEditableTarget =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          (target instanceof HTMLElement && target.isContentEditable);
        if (!isEditableTarget) {
          event.preventDefault();
          deleteSelectedLayer();
        }
      }
    }

    function handleDocumentPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (stageRef.current?.contains(target)) return;
      if (target.closest("[data-social-preview-editor-control]")) return;
      setSelection(null);
      setEditingTextLayerId(null);
      setTextSelection(null);
      setDragState(null);
      setGuides([]);
    }

    document.addEventListener("keydown", handleDocumentKeyDown);
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateScale = () => {
      const rect = stage.getBoundingClientRect();
      setStageScale(rect.width / composition.width);
    };

    updateScale();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateScale);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [composition.width]);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      renderSocialPreviewBlob(
        composition,
        format,
        quality,
        targetSizeKb > 0 ? targetSizeKb * 1024 : null,
      )
        .then((result) => {
          if (cancelled) return;
          setPreviewBlob(result.blob);
          setEffectiveQuality(result.effectiveQuality);
          setRenderError(null);
        })
        .catch((error) => {
          if (cancelled) return;
          setPreviewBlob(null);
          setRenderError(error instanceof Error ? error.message : common.unknownError);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [common.unknownError, composition, format, quality, targetSizeKb]);

  async function uploadRemoteSocialPreviewImage(url: string, name: string) {
    return importRemotePreviewAsset.mutateAsync({ imageUrl: url, name });
  }

  async function addImageLayer(url: string, alt?: string | null) {
    const layer = createImageLayer(url, alt);
    try {
      const dimensions = await loadImageDimensions(url);
      layer.width = dimensions.width;
      layer.height = dimensions.height;
      layer.x = (composition.width - dimensions.width) / 2;
      layer.y = (composition.height - dimensions.height) / 2;
    } catch {
      // Keep renderer fallback dimensions when the browser cannot read the image metadata.
    }
    commitComposition((current) => ({ ...current, layers: [...current.layers, layer] }));
    setSelection({ type: "layer", id: layer.id });
    setActiveTool("image");
    setEditingTextLayerId(null);
  }

  async function handleLocalImageFile(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    const baseName = file.name.replace(/\.[^.]+$/, "") || t.addImage;
    try {
      const media = await uploadPreview.mutateAsync({ blob: file, name: baseName });
      await addImageLayer(media.url, file.name);
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : common.unknownError);
    }
  }

  function handleStagePointerDown() {
    setSelection(null);
    setEditingTextLayerId(null);
    setTextSelection(null);
    setDragState(null);
    setGuides([]);
  }

  function handleLayerPointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    layer: SocialPreviewLayer,
  ) {
    const stage = stageRef.current;
    if (!stage) return;
    event.preventDefault();
    event.stopPropagation();
    const position = getPointerPosition(event, stage);
    setSelection({ type: "layer", id: layer.id });
    setActiveTool(layer.type);
    if (isLayerLocked(layer)) {
      setEditingTextLayerId(null);
      setDragState(null);
      return;
    }
    if (layer.type === "text") {
      const now = Date.now();
      const previous = textClickRef.current;
      const isTextDoubleClick =
        previous?.id === layer.id &&
        now - previous.at < 450 &&
        Math.abs(previous.x - position.x) < 8 &&
        Math.abs(previous.y - position.y) < 8;
      textClickRef.current = { id: layer.id, x: position.x, y: position.y, at: now };
      if (isTextDoubleClick) {
        setEditingTextLayerId(layer.id);
        setDragState(null);
        return;
      }
    } else {
      textClickRef.current = null;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setEditingTextLayerId(null);
    pushHistorySnapshot();
    setDragState({
      mode: "layer-move",
      id: layer.id,
      startX: position.x,
      startY: position.y,
      originX: layer.x,
      originY: layer.y,
    });
  }

  function handleResizePointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    layer: SocialPreviewLayer,
    handle: ResizeHandle,
  ) {
    const stage = stageRef.current;
    if (!stage || isLayerLocked(layer)) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const position = getPointerPosition(event, stage);
    setSelection({ type: "layer", id: layer.id });
    setActiveTool(layer.type);
    setEditingTextLayerId(null);
    pushHistorySnapshot();
    setDragState({
      mode: "layer-resize",
      id: layer.id,
      handle,
      startX: position.x,
      startY: position.y,
      originX: layer.x,
      originY: layer.y,
      originWidth: layer.width,
      originHeight: layer.height,
      originRadius: layer.type === "shape" ? layer.radius : undefined,
    });
  }

  function handleRotatePointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    layer: SocialPreviewLayer,
  ) {
    const stage = stageRef.current;
    if (!stage || isLayerLocked(layer)) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;
    setSelection({ type: "layer", id: layer.id });
    setActiveTool(layer.type);
    setEditingTextLayerId(null);
    pushHistorySnapshot();
    setDragState({
      mode: "layer-rotate",
      id: layer.id,
      centerX,
      centerY,
      startAngle: getPointerAngle(event, stage, centerX, centerY),
      originRotation: layer.rotation,
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState) return;
    const stage = stageRef.current;
    if (!stage) return;
    const position = getPointerPosition(event, stage);

    if (dragState.mode === "layer-rotate") {
      const active = composition.layers.find((layer) => layer.id === dragState.id);
      if (!active || isLayerLocked(active)) return;
      const angle = getPointerAngle(event, stage, dragState.centerX, dragState.centerY);
      setComposition((current) =>
        updateLayer(current, dragState.id, {
          rotation: dragState.originRotation + angle - dragState.startAngle,
        }),
      );
      return;
    }

    const active = composition.layers.find((layer) => layer.id === dragState.id);
    if (!active || isLayerLocked(active)) return;

    if (dragState.mode === "layer-resize") {
      const shadowLayer = {
        ...active,
        x: dragState.originX,
        y: dragState.originY,
        width: dragState.originWidth,
        height: dragState.originHeight,
      } as SocialPreviewLayer;
      const proportionalResize = event.shiftKey && isCornerHandle(dragState.handle);
      const resized = resizeLayer(
        shadowLayer,
        dragState.handle,
        position.x - dragState.startX,
        position.y - dragState.startY,
        proportionalResize,
      );
      const snapped = proportionalResize
        ? { patch: resized, guides: [] }
        : snapResizeLayer(composition, active, dragState.handle, resized);
      const radius =
        active.type === "shape" && dragState.originRadius !== undefined
          ? getResizedShapeRadius(
              active,
              snapped.patch,
              dragState.originWidth,
              dragState.originHeight,
              dragState.originRadius,
            )
          : undefined;
      setGuides(snapped.guides);
      setComposition((current) =>
        updateLayer(
          current,
          dragState.id,
          radius === undefined ? snapped.patch : { ...snapped.patch, radius },
        ),
      );
      return;
    }

    const rawX = dragState.originX + position.x - dragState.startX;
    const rawY = dragState.originY + position.y - dragState.startY;
    const snapped = snapLayer(composition, active, rawX, rawY);
    setGuides(snapped.guides);
    setComposition((current) => updateLayer(current, dragState.id, { x: snapped.x, y: snapped.y }));
  }

  function finishDrag() {
    setDragState(null);
    setGuides([]);
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    const delta = event.deltaY < 0 ? 0.08 : -0.08;
    if (selectedLayer?.type === "image" && !selectedLayerLocked) {
      event.preventDefault();
      const nextZoom = clamp(getImageZoom(selectedLayer) + delta, 0.1, 10);
      commitComposition((current) => updateLayer(current, selectedLayer.id, { zoom: nextZoom }));
    }
  }

  function handleStageKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!selection) return;
    const step = event.shiftKey ? 10 : 1;
    const deltas: Record<string, [number, number] | undefined> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();

    commitComposition((current) => {
      const active = current.layers.find((layer) => layer.id === selection.id);
      if (!active || isLayerLocked(active)) return current;
      return updateLayer(current, selection.id, {
        x: active.x + delta[0],
        y: active.y + delta[1],
      });
    });
  }

  function updateSelectedLayer(patch: Partial<SocialPreviewLayer>) {
    if (!selectedLayer || selectedLayerLocked) return;
    commitComposition((current) => {
      if (selectedLayer.type === "text" && "text" in patch) {
        return updateLayer(current, selectedLayer.id, {
          ...patch,
          colorRanges: [],
          styleRanges: [],
        });
      }

      if (selectedLayer.type === "text" && hasTextStylePatch(patch)) {
        const layer = current.layers.find((entry) => entry.id === selectedLayer.id);
        if (layer?.type !== "text") return current;
        const textStylePatch = pickTextStylePatch(patch);
        const hasRangeSelection =
          textSelection?.layerId === selectedLayer.id && textSelection.start !== textSelection.end;
        const nextLayer = hasRangeSelection
          ? applyTextStyleRange(layer, textSelection.start, textSelection.end, textStylePatch)
          : applyTextStyleToWholeLayer(layer, textStylePatch);
        return updateLayer(current, selectedLayer.id, nextLayer);
      }

      return updateLayer(current, selectedLayer.id, patch);
    });
  }

  function deleteSelectedLayer() {
    if (!selectedLayer || selectedLayerLocked) return;
    commitComposition((current) => removeLayer(current, selectedLayer.id));
    setSelection(null);
    setEditingTextLayerId(null);
  }

  function selectLayerFromPanel(layer: SocialPreviewLayer) {
    setSelection({ type: "layer", id: layer.id });
    setActiveTool(layer.type);
    setEditingTextLayerId(null);
    setTextSelection(null);
  }

  function renameLayer(layerId: string, nextName: string) {
    const name = nextName.trim();
    if (!name) return;
    commitComposition((current) => updateLayer(current, layerId, { name }));
  }

  function toggleLayerVisibility(layerId: string) {
    commitComposition((current) => {
      const layer = current.layers.find((entry) => entry.id === layerId);
      if (!layer) return current;
      return updateLayer(current, layerId, { hidden: !isLayerHidden(layer) });
    });
    if (selection?.type === "layer" && selection.id === layerId) {
      setSelection(null);
      setEditingTextLayerId(null);
      setTextSelection(null);
    }
  }

  function toggleLayerLock(layerId: string) {
    commitComposition((current) => {
      const layer = current.layers.find((entry) => entry.id === layerId);
      if (!layer) return current;
      return updateLayer(current, layerId, { locked: !isLayerLocked(layer) });
    });
    if (editingTextLayerId === layerId) setEditingTextLayerId(null);
  }

  function reorderLayerByDrop(
    draggedLayerId: string,
    targetLayerId: string,
    position: "before" | "after",
  ) {
    commitComposition((current) =>
      reorderLayerInPanel(current, draggedLayerId, targetLayerId, position),
    );
  }

  function handleLayerSidebarResizePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = layerSidebarWidth;

    function handlePointerMove(moveEvent: PointerEvent) {
      setLayerSidebarWidth(clamp(startWidth + startX - moveEvent.clientX, 180, 360));
    }

    function handlePointerUp() {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    }

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  }

  function resetEditorTransientState() {
    setSelection(null);
    setEditingTextLayerId(null);
    setTextSelection(null);
    setDragState(null);
    setGuides([]);
    historyRef.current = [];
    futureRef.current = [];
    setHistoryVersion((current) => current + 1);
  }

  useEffect(() => {
    if (!project || loadedProjectIdRef.current === project.id) return;
    loadedProjectIdRef.current = project.id;
    setComposition(migrateBaseImageToLayer(project.composition));
    setProjectName(project.name);
    resetEditorTransientState();
  }, [projectId, project]);

  async function handleSaveProject() {
    if (!project) return;
    await updateProject.mutateAsync({
      id: project.id,
      data: { name: projectName, composition },
    });
  }

  async function handleSave() {
    const safePreviewName = projectName.trim() || t.title;
    const rendered = previewBlob
      ? { blob: previewBlob, effectiveQuality }
      : await renderSocialPreviewBlob(
          composition,
          format,
          quality,
          targetSizeKb > 0 ? targetSizeKb * 1024 : null,
        );
    const media = await uploadPreview.mutateAsync({ blob: rendered.blob, name: safePreviewName });
    await createPreview.mutateAsync({
      name: safePreviewName,
      imageUrl: media.url,
      mediaAssetId: media.id,
      composition,
      width: composition.width,
      height: composition.height,
      format,
      quality: rendered.effectiveQuality,
      sizeBytes: rendered.blob.size,
      activate: false,
    });
  }

  const isSaving = uploadPreview.isPending || createPreview.isPending;
  const isSavingProject = updateProject.isPending;

  if (!isLoadingProjects && !project) {
    return <Navigate to="/system/social-preview" replace />;
  }

  return (
    <PageLayout>
      <PageHeader
        title={t.title}
        titleContent={
          <span
            className={cx(
              "max-w-[16rem] truncate font-serif text-lg font-semibold",
              project ? "text-[var(--ds-text)]" : "text-[var(--ds-text-muted)]",
            )}
            title={project ? projectName : common.loading}
          >
            {project ? projectName : common.loading}
          </span>
        }
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <SaveActionButton
            label={isSavingProject ? common.saving : t.saveProject}
            disabled={!project || isSavingProject || !projectName.trim()}
            busy={isSavingProject}
            onClick={() => void handleSaveProject()}
          />
          <SaveActionButton
            label={isSaving ? common.saving : t.saveAndActivate}
            disabled={isSaving || !!renderError}
            busy={isSaving}
            onClick={() => void handleSave()}
          />
        </div>
      </PageHeader>
      <PageBody className="min-h-0 overflow-y-auto">
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <DashboardSection className="shrink-0">
            <div className="relative rounded-t-xl bg-[var(--ds-section-header-bg)] px-4 py-1.5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ds-text-muted)]">
                <SelectionIcon weight="duotone" className="size-4" />
              </span>
              <div className="ml-[3.75rem]">
                <AttributeBar
                  messages={t}
                  activeTool={activeTool}
                  selectedLayer={selectedLayer}
                  textSelection={textSelection}
                  onLayerChange={updateSelectedLayer}
                  onDeleteLayer={deleteSelectedLayer}
                />
              </div>
            </div>
            <DashboardSection.Body className="!items-stretch">
              <div className="flex w-full items-start gap-2">
                <CanvasToolbar
                  messages={t}
                  activeTool={activeTool}
                  hasLayerSelection={selectedLayer !== null && !selectedLayerLocked}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={undoComposition}
                  onRedo={redoComposition}
                  onAddText={() => {
                    const layer = createTextLayer();
                    commitComposition((current) => ({
                      ...current,
                      layers: [...current.layers, layer],
                    }));
                    setSelection({ type: "layer", id: layer.id });
                    setActiveTool("text");
                    setEditingTextLayerId(null);
                  }}
                  onAddImageFromUnsplash={() => {
                    setActiveTool("image");
                    setBrowserMode("layer");
                  }}
                  onAddImageFromAssets={() => {
                    setActiveTool("image");
                    setAssetPickerOpen(true);
                  }}
                  onAddImageFromComputer={() => imageFileInputRef.current?.click()}
                  onAddShape={() => {
                    const layer = createShapeLayer();
                    commitComposition((current) => ({
                      ...current,
                      layers: [...current.layers, layer],
                    }));
                    setSelection({ type: "layer", id: layer.id });
                    setActiveTool("shape");
                    setEditingTextLayerId(null);
                  }}
                  onDeleteLayer={deleteSelectedLayer}
                />

                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] ?? null;
                    event.currentTarget.value = "";
                    void handleLocalImageFile(file);
                  }}
                />

                <div className="min-w-0 flex-1 self-start">
                  <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] grid-rows-[1.5rem_auto] overflow-hidden border border-[var(--ds-border)] bg-[#202427]">
                    <div className="border-b border-r border-white/10 bg-[#2b2f33]" />
                    <Ruler axis="x" length={composition.width} />
                    <Ruler axis="y" length={composition.height} />
                    <div
                      ref={stageRef}
                      role="application"
                      tabIndex={0}
                      className={cx(
                        "relative aspect-[1200/630] w-full overflow-hidden bg-[var(--ds-bg-elevated)] outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]",
                        null,
                      )}
                      onPointerDown={handleStagePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={finishDrag}
                      onPointerCancel={finishDrag}
                      onWheel={handleWheel}
                      onKeyDown={handleStageKeyDown}
                      style={{ backgroundColor: composition.background.color }}
                    >
                      <div
                        className="absolute left-0 top-0 h-[630px] w-[1200px] origin-top-left"
                        style={{ transform: `scale(${stageScale})` }}
                      >
                        {composition.layers.map((layer) => {
                          if (isLayerHidden(layer)) return null;
                          const selected = selectedLayer?.id === layer.id;
                          return (
                            <div
                              key={layer.id}
                              className={cx("absolute select-none", selected ? "z-20" : "z-10")}
                              style={renderLayerStyle(layer)}
                              onPointerDown={(event) => handleLayerPointerDown(event, layer)}
                              onDoubleClick={(event) => {
                                if (layer.type !== "text" || isLayerLocked(layer)) return;
                                event.preventDefault();
                                event.stopPropagation();
                                setSelection({ type: "layer", id: layer.id });
                                setActiveTool("text");
                                setEditingTextLayerId(layer.id);
                                setDragState(null);
                              }}
                            >
                              <LayerContent
                                layer={layer}
                                selected={selected}
                                editing={editingTextLayerId === layer.id}
                                textSelection={textSelection}
                                onChange={updateSelectedLayer}
                                onEditStart={() => {
                                  if (layer.type === "text" && !isLayerLocked(layer)) {
                                    setEditingTextLayerId(layer.id);
                                  }
                                }}
                                onTextSelectionChange={(range) => setTextSelection(range)}
                                onEditEnd={() => {
                                  setEditingTextLayerId(null);
                                }}
                              />
                              {selected && !isLayerLocked(layer) ? (
                                <SelectionFrame
                                  layer={layer}
                                  onResizePointerDown={handleResizePointerDown}
                                  onRotatePointerDown={handleRotatePointerDown}
                                />
                              ) : selected ? (
                                <div className="pointer-events-none absolute -inset-1 border-2 border-amber-300/80 ring-4 ring-amber-300/15" />
                              ) : null}
                            </div>
                          );
                        })}

                        {guides.map((guide, index) =>
                          guide.axis === "x" ? (
                            <div
                              key={`x-${guide.position}-${index}`}
                              className="absolute top-0 z-30 h-full w-px bg-sky-400"
                              style={{ left: guide.position }}
                            />
                          ) : (
                            <div
                              key={`y-${guide.position}-${index}`}
                              className="absolute left-0 z-30 h-px w-full bg-sky-400"
                              style={{ top: guide.position }}
                            />
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <LayerSidebar
                  messages={t}
                  layers={composition.layers}
                  selectedLayerId={selection?.type === "layer" ? selection.id : null}
                  width={layerSidebarWidth}
                  onResizePointerDown={handleLayerSidebarResizePointerDown}
                  onSelectLayer={selectLayerFromPanel}
                  onRenameLayer={renameLayer}
                  onToggleLayerVisibility={toggleLayerVisibility}
                  onToggleLayerLock={toggleLayerLock}
                  onReorderLayer={reorderLayerByDrop}
                />
              </div>
            </DashboardSection.Body>
          </DashboardSection>

          <LivePreviewSection
            messages={t}
            commonMessages={common}
            blob={previewBlob}
            renderError={renderError}
            effectiveQuality={effectiveQuality}
          />
        </div>
      </PageBody>

      <PageFooter>
        <FooterExportControls
          messages={t}
          format={format}
          quality={quality}
          estimatedSizeBytes={previewBlob?.size ?? null}
          onFormatChange={setFormat}
          onQualityChange={setQuality}
        />
      </PageFooter>
      {browserMode ? (
        <UnsplashBrowser
          defaultQuery=""
          onSelect={(photo) => {
            void (async () => {
              const media = await uploadRemoteSocialPreviewImage(
                photo.url,
                `Unsplash ${photo.unsplashId}`,
              );
              await addImageLayer(media.url, photo.altDescription);
              setBrowserMode(null);
            })();
          }}
          onClose={() => setBrowserMode(null)}
        />
      ) : null}
      <AssetImagePickerDialog
        open={assetPickerOpen}
        messages={t}
        commonMessages={common}
        assets={imageAssets}
        loading={isLoadingMediaAssets}
        onClose={() => setAssetPickerOpen(false)}
        onSelect={(asset) => {
          void addImageLayer(asset.url, asset.displayName);
          setAssetPickerOpen(false);
        }}
      />
    </PageLayout>
  );
}

function LayerSidebar({
  messages,
  layers,
  selectedLayerId,
  width,
  onResizePointerDown,
  onSelectLayer,
  onRenameLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onReorderLayer,
}: {
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  layers: SocialPreviewLayer[];
  selectedLayerId: string | null;
  width: number;
  onResizePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onSelectLayer: (layer: SocialPreviewLayer) => void;
  onRenameLayer: (layerId: string, name: string) => void;
  onToggleLayerVisibility: (layerId: string) => void;
  onToggleLayerLock: (layerId: string) => void;
  onReorderLayer: (
    draggedLayerId: string,
    targetLayerId: string,
    position: "before" | "after",
  ) => void;
}) {
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{
    layerId: string;
    position: "before" | "after";
  } | null>(null);
  const [editingNameTarget, setEditingNameTarget] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const panelLayers = useMemo(() => [...layers].reverse(), [layers]);

  function getDropPosition(event: React.DragEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY > rect.top + rect.height / 2 ? "after" : "before";
  }

  function startNameEdit(target: string, currentName: string) {
    setEditingNameTarget(target);
    setEditingName(currentName);
  }

  function finishNameEdit() {
    if (!editingNameTarget) return;
    const nextName = editingName.trim();
    if (nextName) {
      onRenameLayer(editingNameTarget, nextName);
    }
    setEditingNameTarget(null);
    setEditingName("");
  }

  function cancelNameEdit() {
    setEditingNameTarget(null);
    setEditingName("");
  }

  function getLayerTypeLabel(layer: SocialPreviewLayer) {
    if (layer.type === "text") return messages.textLayer;
    if (layer.type === "image") return messages.imageLayer;
    return messages.shapeLayer;
  }

  return (
    <aside
      data-social-preview-editor-control="true"
      className="relative flex max-h-full shrink-0 flex-col self-start rounded-[12px] border border-[var(--ds-border)] bg-[var(--ds-surface)]"
      style={{ width }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={messages.resizeLayerSidebar}
        className="absolute -left-2 top-0 z-20 h-full w-3 cursor-col-resize"
        onPointerDown={onResizePointerDown}
      >
        <span className="absolute left-1 top-2 h-[calc(100%-1rem)] w-px rounded-full bg-[var(--ds-border)]" />
      </div>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[var(--ds-border)] px-3">
        <SelectionIcon weight="duotone" className="size-4 text-[var(--ds-text-muted)]" />
        <h3 className="truncate text-sm font-semibold text-[var(--ds-text)]">
          {messages.layersTitle}
        </h3>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDragOver(null);
          }
        }}
      >
        {panelLayers.length === 0 ? (
          <p className="px-2 py-3 text-xs text-[var(--ds-text-muted)]">{messages.layersEmpty}</p>
        ) : (
          <div className="divide-y divide-[var(--ds-border-subtle)]">
            {panelLayers.map((layer) => {
              const selected = layer.id === selectedLayerId;
              const locked = isLayerLocked(layer);
              const hidden = isLayerHidden(layer);
              const dropBefore = dragOver?.layerId === layer.id && dragOver.position === "before";
              const dropAfter = dragOver?.layerId === layer.id && dragOver.position === "after";
              return (
                <div
                  key={layer.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", layer.id);
                    setDraggedLayerId(layer.id);
                  }}
                  onDragEnd={() => {
                    setDraggedLayerId(null);
                    setDragOver(null);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (!draggedLayerId || draggedLayerId === layer.id) return;
                    event.dataTransfer.dropEffect = "move";
                    setDragOver({ layerId: layer.id, position: getDropPosition(event) });
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const draggedId = event.dataTransfer.getData("text/plain") || draggedLayerId;
                    if (draggedId && draggedId !== layer.id) {
                      onReorderLayer(draggedId, layer.id, getDropPosition(event));
                    }
                    setDraggedLayerId(null);
                    setDragOver(null);
                  }}
                  className={cx(
                    "relative transition-colors hover:bg-[var(--ds-surface-hover)]",
                    selected && "bg-sky-400/10",
                    hidden && "opacity-45",
                    draggedLayerId === layer.id && "opacity-45",
                  )}
                >
                  {dropBefore ? (
                    <span className="absolute left-0 right-0 top-0 z-10 h-0.5 bg-sky-400" />
                  ) : null}
                  {dropAfter ? (
                    <span className="absolute bottom-0 left-0 right-0 z-10 h-0.5 bg-sky-400" />
                  ) : null}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-2 py-1.5 pr-16 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
                    onClick={() => onSelectLayer(layer)}
                  >
                    <span className="flex w-4 shrink-0 cursor-grab items-center justify-center text-xs text-[var(--ds-text-muted)] active:cursor-grabbing">
                      ⋮⋮
                    </span>
                    <span className="min-w-0 flex-1">
                      {editingNameTarget === layer.id ? (
                        <input
                          type="text"
                          value={editingName}
                          className="h-5 w-full rounded border border-[var(--ds-border)] bg-[var(--ds-form-control-bg)] px-1 text-xs font-medium text-[var(--ds-text)] outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]"
                          autoFocus
                          onChange={(event) => setEditingName(event.currentTarget.value)}
                          onBlur={finishNameEdit}
                          onClick={(event) => event.stopPropagation()}
                          onPointerDown={(event) => event.stopPropagation()}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              finishNameEdit();
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelNameEdit();
                            }
                          }}
                        />
                      ) : (
                        <span
                          className="block truncate text-xs font-medium text-[var(--ds-text)]"
                          onDoubleClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            startNameEdit(layer.id, getLayerLabel(layer));
                          }}
                        >
                          {getLayerLabel(layer)}
                        </span>
                      )}
                      <span className="block truncate text-[11px] text-[var(--ds-text-muted)]">
                        {getLayerTypeLabel(layer)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={cx(
                      "absolute right-8 top-1/2 flex h-6 min-w-6 -translate-y-1/2 items-center justify-center rounded px-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
                      hidden
                        ? "bg-slate-400/10 text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)]"
                        : "text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)]",
                    )}
                    aria-label={hidden ? messages.showLayer : messages.hideLayer}
                    title={hidden ? messages.showLayer : messages.hideLayer}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleLayerVisibility(layer.id);
                    }}
                  >
                    {hidden ? (
                      <EyeSlashIcon weight="duotone" className="size-3.5" />
                    ) : (
                      <EyeIcon weight="duotone" className="size-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    className={cx(
                      "absolute right-1 top-1/2 flex h-6 min-w-6 -translate-y-1/2 items-center justify-center rounded px-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
                      locked
                        ? "bg-amber-400/15 text-amber-200 hover:bg-amber-400/25"
                        : "text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)]",
                    )}
                    aria-label={locked ? messages.unlockLayer : messages.lockLayer}
                    title={locked ? messages.unlockLayer : messages.lockLayer}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleLayerLock(layer.id);
                    }}
                  >
                    {locked ? (
                      <LockKeyIcon weight="duotone" className="size-3.5" />
                    ) : (
                      <LockKeyOpenIcon weight="duotone" className="size-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

function LivePreviewSection({
  messages,
  commonMessages,
  blob,
  renderError,
  effectiveQuality,
}: {
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  commonMessages: ReturnType<typeof useI18n>["messages"]["common"];
  blob: Blob | null;
  renderError: string | null;
  effectiveQuality: number;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewSizeBytes = blob?.size ?? null;

  useEffect(() => {
    if (!blob) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  return (
    <DashboardSection className="w-full shrink-0 xl:w-1/2">
      <DashboardSection.Header
        icon={<ImageIcon weight="duotone" className="size-4" />}
        title={messages.livePreviewTitle}
      />
      <DashboardSection.Body>
        {renderError ? (
          <p className="text-sm text-red-500">{renderError}</p>
        ) : previewUrl && previewSizeBytes !== null ? (
          <div className="flex min-h-0 flex-col gap-3">
            <div className="overflow-hidden rounded-[12px] border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)]">
              <img
                src={previewUrl}
                alt=""
                className="block aspect-[1200/630] w-full object-contain"
              />
            </div>
            <p className="shrink-0 text-xs text-[var(--ds-text-muted)]">
              {messages.previewMeta
                .replace("{size}", formatBytes(previewSizeBytes))
                .replace("{quality}", String(effectiveQuality))}
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--ds-text-muted)]">{commonMessages.loading}</p>
        )}
      </DashboardSection.Body>
    </DashboardSection>
  );
}

function SocialPreviewImagesPage() {
  const { messages } = useI18n();
  const t = messages.system.socialPreview;

  return (
    <PageLayout>
      <PageHeader
        title={t.title}
        titleContent={
          <span className="max-w-[16rem] truncate font-serif text-lg font-semibold text-[var(--ds-text)]">
            {t.imagesNavLabel}
          </span>
        }
      />
      <PageBody className="min-h-0 overflow-hidden">
        <SavedPreviewImagesSection />
      </PageBody>
    </PageLayout>
  );
}

function SocialPreviewOverviewPage() {
  const { messages, locale } = useI18n();
  const t = messages.system.socialPreview;
  const common = messages.common;
  const navigate = useNavigate();
  const { data: savedProjects = [], isLoading: isLoadingProjects } = useSocialPreviewProjects();
  const createProject = useCreateSocialPreviewProject();
  const updateProject = useUpdateSocialPreviewProject();
  const deleteProject = useDeleteSocialPreviewProject();
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [renameProjectTarget, setRenameProjectTarget] = useState<SocialPreviewProjectEntry | null>(
    null,
  );
  const [deleteProjectTargetId, setDeleteProjectTargetId] = useState<number | null>(null);
  const [projectContextMenu, setProjectContextMenu] = useState<{
    origin: { x: number; y: number };
    project: SocialPreviewProjectEntry;
  } | null>(null);

  async function handleCreateProject(nextProjectName: string) {
    const project = await createProject.mutateAsync({
      name: nextProjectName,
      composition: createEmptySocialPreviewComposition(),
    });
    setNewProjectDialogOpen(false);
    void navigate(`/system/social-preview/${project.id}`);
  }

  const projectColumns = useMemo<Array<ColumnDef<SocialPreviewProjectEntry>>>(
    () => [
      {
        id: "thumbnail",
        header: "",
        className: "w-28",
        cell: (project) => <SocialPreviewProjectThumbnail composition={project.composition} />,
      },
      {
        id: "name",
        header: t.nameLabel,
        sortKey: (project) => project.name,
        cell: (project) => (
          <button
            type="button"
            onClick={() => navigate(`/system/social-preview/${project.id}`)}
            className="block max-w-[22rem] truncate text-left font-medium text-[var(--ds-text)] hover:underline"
          >
            {project.name}
          </button>
        ),
      },
      {
        id: "updatedAt",
        header: t.updatedAtLabel,
        sortKey: (project) => new Date(project.updatedAt).getTime(),
        cell: (project) => (
          <span className="whitespace-nowrap text-xs text-[var(--ds-text-muted)]">
            {new Date(project.updatedAt).toLocaleString(locale)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        className: "w-52",
        cell: (project) => (
          <div className="flex items-center justify-end gap-1">
            <TableActionButton
              type="button"
              onClick={() => navigate(`/system/social-preview/${project.id}`)}
              icon={<FileTextIcon weight="duotone" className="size-3.5" />}
              label={t.loadProject}
            />
            <DeleteActionButton
              size="action"
              label={common.delete}
              disabled={deleteProject.isPending}
              onClick={() => setDeleteProjectTargetId(project.id)}
            />
          </div>
        ),
      },
    ],
    [
      common.delete,
      deleteProject.isPending,
      locale,
      navigate,
      t.loadProject,
      t.nameLabel,
      t.updatedAtLabel,
    ],
  );

  return (
    <PageLayout>
      <PageHeader title={t.title}>
        <CreateActionButton
          label={t.newProject}
          disabled={createProject.isPending}
          busy={createProject.isPending}
          onClick={() => setNewProjectDialogOpen(true)}
        />
      </PageHeader>

      <PageBody className="min-h-0 overflow-y-auto">
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <DashboardSection className="flex min-h-0 flex-col">
            <DashboardSection.Header
              icon={<SelectionIcon weight="duotone" className="size-4" />}
              title={t.savedProjectsTitle}
            />
            <DashboardSection.Body className="min-h-0 flex-1 overflow-y-auto !gap-0 !p-0">
              {isLoadingProjects ? (
                <p className="p-4 text-sm text-[var(--ds-text-muted)]">{common.loading}</p>
              ) : savedProjects.length === 0 ? (
                <ContentUnavailableView
                  icon={<SelectionIcon weight="duotone" aria-hidden />}
                  title={t.emptyProjectsTitle}
                  subtitle={t.emptyProjectsHint}
                />
              ) : (
                <div className="social-preview-projects-table">
                  <DataTable
                    columns={projectColumns}
                    data={savedProjects}
                    getRowKey={(project) => project.id}
                    getRowProps={(project) => ({
                      onContextMenu: (event) => {
                        event.preventDefault();
                        setProjectContextMenu({
                          origin: { x: event.clientX, y: event.clientY },
                          project,
                        });
                      },
                    })}
                    initialSort={{ id: "updatedAt", dir: "desc" }}
                  />
                </div>
              )}
            </DashboardSection.Body>
          </DashboardSection>
        </div>
      </PageBody>

      <NewProjectDialog
        open={newProjectDialogOpen}
        messages={t}
        commonMessages={common}
        busy={createProject.isPending}
        onCancel={() => setNewProjectDialogOpen(false)}
        onSubmit={(nextProjectName) => void handleCreateProject(nextProjectName)}
      />

      <RenameDialog
        open={renameProjectTarget !== null}
        title={t.renameProjectTitle}
        label={t.projectNameLabel}
        initialName={renameProjectTarget?.name ?? ""}
        busy={updateProject.isPending}
        cancelLabel={common.cancel}
        saveLabel={common.save}
        onClose={() => setRenameProjectTarget(null)}
        onSubmit={(nextName) => {
          if (!renameProjectTarget) return;
          updateProject.mutate(
            { id: renameProjectTarget.id, data: { name: nextName } },
            { onSuccess: () => setRenameProjectTarget(null) },
          );
        }}
      />

      <SubMenu
        open={projectContextMenu !== null}
        origin={projectContextMenu?.origin ?? null}
        onOpenChange={(open) => {
          if (!open) setProjectContextMenu(null);
        }}
      >
        {projectContextMenu ? (
          <>
            <SubMenu.Item
              icon={<PencilSimpleIcon weight="duotone" className="size-3.5" />}
              onSelect={() => setRenameProjectTarget(projectContextMenu.project)}
            >
              {t.renameAction}
            </SubMenu.Item>
            <SubMenu.Item
              icon={<FileTextIcon weight="duotone" className="size-3.5" />}
              onSelect={() => navigate(`/system/social-preview/${projectContextMenu.project.id}`)}
            >
              {t.loadProject}
            </SubMenu.Item>
            <SubMenu.Item separator />
            <SubMenu.Item
              disabled={deleteProject.isPending}
              icon={<TrashIcon weight="duotone" className="size-3.5" />}
              onSelect={() => setDeleteProjectTargetId(projectContextMenu.project.id)}
              variant="danger"
            >
              {common.delete}
            </SubMenu.Item>
          </>
        ) : null}
      </SubMenu>

      <DeleteConfirmDialog
        open={deleteProjectTargetId !== null}
        title={t.deleteProjectConfirmTitle}
        description={t.deleteProjectConfirmDescription}
        cancelLabel={common.cancel}
        deleteLabel={common.delete}
        isPending={deleteProject.isPending}
        onClose={() => setDeleteProjectTargetId(null)}
        onConfirm={() => {
          if (deleteProjectTargetId === null) return;
          deleteProject.mutate(deleteProjectTargetId, {
            onSuccess: () => setDeleteProjectTargetId(null),
          });
        }}
      />
    </PageLayout>
  );
}

function SocialPreviewProjectThumbnail({ composition }: { composition: SocialPreviewComposition }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    renderSocialPreviewBlob(composition, "image/jpeg", 70, null)
      .then((result) => {
        objectUrl = URL.createObjectURL(result.blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [composition]);

  return (
    <div className="flex h-12 w-24 items-center justify-center overflow-hidden rounded border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)]">
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <ImageIcon weight="duotone" className="size-5 text-[var(--ds-text-muted)]" />
      )}
    </div>
  );
}

function SavedPreviewImagesSection() {
  const { messages } = useI18n();
  const t = messages.system.socialPreview;
  const common = messages.common;
  const { data: savedImages = [], isLoading } = useSocialPreviewImages();
  const setActivePreview = useSetActiveSocialPreviewImage();
  const setDefaultPreview = useSetDefaultSocialPreviewImage();
  const updatePreview = useUpdateSocialPreviewImage();
  const deletePreview = useDeleteSocialPreviewImage();
  const [renameTarget, setRenameTarget] = useState<SocialPreviewImageEntry | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    origin: { x: number; y: number };
    image: SocialPreviewImageEntry;
  } | null>(null);
  const [imageGridSize, setImageGridSize] = useState(() => {
    const stored = window.localStorage.getItem("social-preview-export-grid-size");
    const value = stored ? Number(stored) : 3;
    return Number.isFinite(value) ? clamp(value, 1, 4) : 3;
  });
  const [copiedShareImageId, setCopiedShareImageId] = useState<number | null>(null);
  const savedImageCardWidth = 150 + ((imageGridSize - 1) / 3) * 270;
  const publicPreviewImage =
    savedImages.find((image) => image.isActive) ?? savedImages.find((image) => image.isDefault);
  const publicPreviewImageId = publicPreviewImage?.id ?? null;
  useEffect(() => {
    window.localStorage.setItem("social-preview-export-grid-size", String(imageGridSize));
  }, [imageGridSize]);

  useEffect(() => {
    if (copiedShareImageId === null) return;
    const timeoutId = window.setTimeout(() => setCopiedShareImageId(null), 1600);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copiedShareImageId]);

  async function copyShareUrl(image: SocialPreviewImageEntry) {
    if (image.id !== publicPreviewImageId) return;
    try {
      await navigator.clipboard.writeText(getSocialPreviewShareUrl(image));
    } catch {
      return;
    }
    setCopiedShareImageId(image.id);
  }

  return (
    <DashboardSection className="flex min-h-0 flex-1 flex-col">
      <DashboardSection.Header
        icon={<ImageIcon weight="duotone" className="size-4" />}
        title={t.savedTitle}
        addOn={
          <div className="flex items-center gap-2">
            <CopyActionButton
              disabled={!publicPreviewImage}
              label={publicPreviewImage ? t.copyShareUrl : t.shareUrlUnavailable}
              onClick={() => {
                if (publicPreviewImage) void copyShareUrl(publicPreviewImage);
              }}
            >
              {publicPreviewImage && copiedShareImageId === publicPreviewImage.id
                ? t.shareUrlCopied
                : t.copyShareUrl}
            </CopyActionButton>
            <label className="flex items-center gap-2 text-xs text-[var(--ds-text-muted)]">
              {t.imageGridSizeLabel}
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={imageGridSize}
                onChange={(event) => setImageGridSize(Number(event.currentTarget.value))}
                className="w-24 accent-[var(--color-primary)]"
              />
            </label>
          </div>
        }
      />
      <DashboardSection.Body className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-[var(--ds-text-muted)]">{common.loading}</p>
        ) : savedImages.length === 0 ? (
          <ContentUnavailableView
            icon={<ImageIcon weight="duotone" aria-hidden />}
            title={t.emptyTitle}
            subtitle={t.emptyHint}
          />
        ) : (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(0, ${savedImageCardWidth}px))`,
              justifyContent: "start",
            }}
          >
            {savedImages.map((image) => {
              const isPublicPreviewImage = image.id === publicPreviewImageId;
              return (
                <div
                  key={image.id}
                  className="group rounded-[12px] border border-[var(--ds-border)] bg-[var(--ds-surface)]"
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setContextMenu({ origin: { x: event.clientX, y: event.clientY }, image });
                  }}
                >
                  <div className="relative overflow-hidden rounded-t-[12px]">
                    <img
                      src={image.imageUrl}
                      alt=""
                      className="aspect-[1200/630] w-full object-cover"
                    />
                    <div className="absolute left-1 top-1 z-10 flex flex-col items-start gap-1">
                      {image.isActive ? (
                        <span
                          className="inline-flex items-center gap-1 border border-emerald-300/30 bg-emerald-400/25 px-2 py-0.5 text-xs font-medium text-emerald-50 backdrop-blur"
                          style={{ borderRadius: "8px" }}
                        >
                          <CheckCircleIcon weight="duotone" className="size-3.5" />
                          {t.activeBadge}
                        </span>
                      ) : null}
                      {image.isDefault ? (
                        <span
                          className="inline-flex items-center gap-1 border border-amber-300/30 bg-amber-400/25 px-2 py-0.5 text-xs font-medium text-amber-50 backdrop-blur"
                          style={{ borderRadius: "8px" }}
                        >
                          <StarIcon weight="duotone" className="size-3.5" />
                          {t.defaultBadge}
                        </span>
                      ) : null}
                    </div>
                    <div
                      className="absolute inset-x-0 bottom-0 z-[9] h-9 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                      style={{ backgroundColor: "rgb(0 0 0 / 0.45)" }}
                    />
                    <div className="absolute inset-x-1 bottom-1 z-10 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        type="button"
                        aria-label={t.deleteImage}
                        title={t.deleteImage}
                        disabled={deletePreview.isPending}
                        onClick={() => setDeleteTargetId(image.id)}
                        className="flex size-7 items-center justify-center border border-white/30 bg-black/35 text-white backdrop-blur hover:bg-red-500/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] disabled:pointer-events-none disabled:opacity-40"
                        style={{ borderRadius: "8px" }}
                      >
                        <TrashIcon weight="duotone" className="size-3.5" />
                      </button>
                      <div className="flex items-center gap-1">
                        <a
                          href={image.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t.openImage}
                          title={t.openImage}
                          className="flex size-7 items-center justify-center border border-white/30 bg-black/35 text-white backdrop-blur hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
                          style={{ borderRadius: "8px" }}
                        >
                          <ArrowSquareOutIcon weight="duotone" className="size-3.5" />
                        </a>
                        <button
                          type="button"
                          aria-label={isPublicPreviewImage ? t.copyShareUrl : t.shareUrlUnavailable}
                          title={
                            isPublicPreviewImage
                              ? copiedShareImageId === image.id
                                ? t.shareUrlCopied
                                : t.copyShareUrl
                              : t.shareUrlUnavailable
                          }
                          disabled={!isPublicPreviewImage}
                          onClick={() => void copyShareUrl(image)}
                          className="flex size-7 items-center justify-center border border-white/30 bg-black/35 text-white backdrop-blur hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] disabled:pointer-events-none disabled:opacity-40"
                          style={{ borderRadius: "8px" }}
                        >
                          <CopyIcon weight="duotone" className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={t.setDefault}
                          title={t.setDefault}
                          disabled={image.isDefault || setDefaultPreview.isPending}
                          onClick={() =>
                            setDefaultPreview.mutate({ id: image.id, isDefault: true })
                          }
                          className="flex size-7 items-center justify-center border border-amber-300/35 bg-amber-500/20 text-amber-50 backdrop-blur hover:bg-amber-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] disabled:pointer-events-none disabled:opacity-50"
                          style={{ borderRadius: "8px" }}
                        >
                          <StarIcon weight="duotone" className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={image.isActive ? t.unsetActive : t.setActive}
                          title={image.isActive ? t.unsetActive : t.setActive}
                          disabled={setActivePreview.isPending}
                          onClick={() =>
                            setActivePreview.mutate({ id: image.id, active: !image.isActive })
                          }
                          className="flex size-7 items-center justify-center border border-emerald-300/35 bg-emerald-500/20 text-emerald-50 backdrop-blur hover:bg-emerald-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] disabled:pointer-events-none disabled:opacity-50"
                          style={{ borderRadius: "8px" }}
                        >
                          <CheckCircleIcon weight="duotone" className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-0.5 px-2 py-2">
                    <p
                      className="truncate text-sm font-medium text-[var(--ds-text)]"
                      title={image.name}
                    >
                      {image.name}
                    </p>
                    <p className="text-xs text-[var(--ds-text-muted)]">
                      {image.width} × {image.height} · {formatBytes(image.sizeBytes)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashboardSection.Body>

      <RenameDialog
        open={renameTarget !== null}
        title={t.renameImageTitle}
        label={t.imageNameLabel}
        initialName={renameTarget?.name ?? ""}
        busy={updatePreview.isPending}
        cancelLabel={common.cancel}
        saveLabel={common.save}
        onClose={() => setRenameTarget(null)}
        onSubmit={(nextName) => {
          if (!renameTarget) return;
          updatePreview.mutate(
            { id: renameTarget.id, name: nextName },
            { onSuccess: () => setRenameTarget(null) },
          );
        }}
      />

      <SubMenu
        open={contextMenu !== null}
        origin={contextMenu?.origin ?? null}
        onOpenChange={(open) => {
          if (!open) setContextMenu(null);
        }}
      >
        {contextMenu ? (
          <>
            <SubMenu.Item
              icon={<PencilSimpleIcon weight="duotone" className="size-3.5" />}
              onSelect={() => setRenameTarget(contextMenu.image)}
            >
              {t.renameAction}
            </SubMenu.Item>
            <SubMenu.Item
              icon={<ArrowSquareOutIcon weight="duotone" className="size-3.5" />}
              onSelect={() =>
                window.open(contextMenu.image.imageUrl, "_blank", "noopener,noreferrer")
              }
            >
              {t.openImage}
            </SubMenu.Item>
            <SubMenu.Item
              disabled={contextMenu.image.id !== publicPreviewImageId}
              icon={<CopyIcon weight="duotone" className="size-3.5" />}
              onSelect={() => void copyShareUrl(contextMenu.image)}
            >
              {contextMenu.image.id === publicPreviewImageId
                ? t.copyShareUrl
                : t.shareUrlUnavailable}
            </SubMenu.Item>
            <SubMenu.Item
              disabled={contextMenu.image.isDefault || setDefaultPreview.isPending}
              icon={<StarIcon weight="duotone" className="size-3.5" />}
              onSelect={() =>
                setDefaultPreview.mutate({ id: contextMenu.image.id, isDefault: true })
              }
            >
              {contextMenu.image.isDefault ? t.defaultBadge : t.setDefault}
            </SubMenu.Item>
            <SubMenu.Item
              disabled={setActivePreview.isPending}
              icon={<CheckCircleIcon weight="duotone" className="size-3.5" />}
              onSelect={() =>
                setActivePreview.mutate({
                  id: contextMenu.image.id,
                  active: !contextMenu.image.isActive,
                })
              }
            >
              {contextMenu.image.isActive ? t.unsetActive : t.setActive}
            </SubMenu.Item>
            <SubMenu.Item separator />
            <SubMenu.Item
              disabled={deletePreview.isPending}
              icon={<TrashIcon weight="duotone" className="size-3.5" />}
              onSelect={() => setDeleteTargetId(contextMenu.image.id)}
              variant="danger"
            >
              {common.delete}
            </SubMenu.Item>
          </>
        ) : null}
      </SubMenu>

      <DeleteConfirmDialog
        open={deleteTargetId !== null}
        title={t.deleteConfirmTitle}
        description={t.deleteConfirmDescription}
        cancelLabel={common.cancel}
        deleteLabel={common.delete}
        isPending={deletePreview.isPending}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId === null) return;
          deletePreview.mutate(deleteTargetId, { onSuccess: () => setDeleteTargetId(null) });
        }}
      />
    </DashboardSection>
  );
}

function NewProjectDialog({
  open,
  messages,
  commonMessages,
  busy,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  commonMessages: ReturnType<typeof useI18n>["messages"]["common"];
  busy: boolean;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const canSubmit = name.trim().length > 0 && !busy;

  useEffect(() => {
    if (open) {
      setName("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <Dialog
      open
      title={messages.newProjectTitle}
      titleIcon={<PlusIcon weight="duotone" className={dialogHeaderIconClass} />}
      onClose={busy ? () => undefined : onCancel}
    >
      <div className="px-6 py-3">
        <DashboardInput
          id="social-preview-new-project-name"
          type="text"
          label={messages.projectNameLabel}
          placeholder={messages.projectNamePlaceholder}
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          autoFocus
        />
      </div>
      <Dialog.Footer>
        <CancelActionButton onClick={onCancel} disabled={busy} label={commonMessages.cancel} />
        <CreateActionButton
          onClick={() => onSubmit(name.trim())}
          disabled={!canSubmit}
          busy={busy}
          label={messages.newProject}
        />
      </Dialog.Footer>
    </Dialog>
  );
}

function RenameDialog({
  open,
  title,
  label,
  initialName,
  busy,
  cancelLabel,
  saveLabel,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  label: string;
  initialName: string;
  busy: boolean;
  cancelLabel: string;
  saveLabel: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && trimmedName !== initialName.trim() && !busy;

  useEffect(() => {
    if (open) setName(initialName);
  }, [initialName, open]);

  if (!open) return null;

  return (
    <Dialog
      open
      title={title}
      titleIcon={<PencilSimpleIcon weight="duotone" className={dialogHeaderIconClass} />}
      onClose={busy ? () => undefined : onClose}
    >
      <div className="px-6 py-3">
        <DashboardInput
          id="social-preview-rename-name"
          type="text"
          label={label}
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          autoFocus
        />
      </div>
      <Dialog.Footer>
        <CancelActionButton onClick={onClose} disabled={busy} label={cancelLabel} />
        <SaveActionButton
          onClick={() => onSubmit(trimmedName)}
          disabled={!canSubmit}
          busy={busy}
          label={saveLabel}
        />
      </Dialog.Footer>
    </Dialog>
  );
}

function AssetImagePickerDialog({
  open,
  messages,
  commonMessages,
  assets,
  loading,
  onClose,
  onSelect,
}: {
  open: boolean;
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  commonMessages: ReturnType<typeof useI18n>["messages"]["common"];
  assets: MediaAsset[];
  loading: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
}) {
  if (!open) return null;

  return (
    <OverlayCard
      open
      onClose={onClose}
      size={{
        storageKey: "social-preview:asset-image-picker-size",
        defaultWidth: 860,
        defaultHeight: 640,
        minWidth: 520,
        minHeight: 420,
      }}
      aria-label={messages.assetPickerTitle}
      style={{ maxHeight: "calc(100vh - 2rem)" }}
    >
      <OverlayCard.Header>
        <div className="flex items-center gap-3">
          <ImageIcon weight="duotone" className={dialogHeaderIconClass} />
          <h2 className="text-base font-semibold text-[var(--ds-text)]">
            {messages.assetPickerTitle}
          </h2>
        </div>
      </OverlayCard.Header>
      <OverlayCard.Body className="min-h-0">
        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3">
            {Array.from({ length: 8 }, (_, index) => `asset-picker-skeleton-${index}`).map(
              (key) => (
                <div key={key} className="space-y-2">
                  <div className="aspect-square animate-pulse rounded-[var(--radius-card)] bg-[var(--ds-bg-elevated)]" />
                  <div className="mx-2 h-3 animate-pulse rounded bg-[var(--ds-bg-elevated)]" />
                </div>
              ),
            )}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex min-h-[18rem] items-center justify-center">
            <ContentUnavailableView
              chromeless
              icon={<ImageIcon weight="duotone" aria-hidden />}
              title={messages.assetPickerEmpty}
              subtitle={messages.assetPickerEmptyHint}
            />
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3">
            {assets.map((asset) => (
              <MediaGridItem
                key={asset.id}
                asset={asset}
                selected={false}
                showText
                title={asset.displayName}
                onSelect={() => onSelect(asset)}
              />
            ))}
          </div>
        )}
      </OverlayCard.Body>
      <OverlayCard.Footer className="flex justify-end gap-2">
        <CancelActionButton label={commonMessages.cancel} onClick={onClose} />
      </OverlayCard.Footer>
    </OverlayCard>
  );
}

function FooterExportControls({
  messages,
  format,
  quality,
  estimatedSizeBytes,
  onFormatChange,
  onQualityChange,
}: {
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  format: SocialPreviewFormat;
  quality: number;
  estimatedSizeBytes: number | null;
  onFormatChange: (value: SocialPreviewFormat) => void;
  onQualityChange: (value: number) => void;
}) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-[var(--ds-text-muted)]">
          {messages.formatLabel}
          <select
            value={format}
            onChange={(event) => onFormatChange(event.currentTarget.value as SocialPreviewFormat)}
            className="h-8 rounded-control border border-[var(--ds-border)] bg-[var(--ds-form-control-bg)] px-2 text-sm text-[var(--ds-text)] outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]"
          >
            {FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--ds-text-muted)]">
          {messages.qualityLabel}: {quality}%
          <input
            type="range"
            min={1}
            max={100}
            value={quality}
            disabled={format === "image/png"}
            onChange={(event) => onQualityChange(Number(event.currentTarget.value))}
            className="w-28 accent-[var(--color-primary)] disabled:opacity-40"
          />
        </label>
        <span className="text-xs text-[var(--ds-text-muted)]">
          {messages.estimatedSizeLabel}:{" "}
          {estimatedSizeBytes === null ? "…" : formatBytes(estimatedSizeBytes)}
        </span>
      </div>
    </div>
  );
}

function CanvasToolbar({
  messages,
  activeTool,
  hasLayerSelection,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddText,
  onAddImageFromUnsplash,
  onAddImageFromAssets,
  onAddImageFromComputer,
  onAddShape,
  onDeleteLayer,
}: {
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  activeTool: ActiveTool;
  hasLayerSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddText: () => void;
  onAddImageFromUnsplash: () => void;
  onAddImageFromAssets: () => void;
  onAddImageFromComputer: () => void;
  onAddShape: () => void;
  onDeleteLayer: () => void;
}) {
  const buttonClass =
    "flex size-8 items-center justify-center rounded-md text-[var(--ds-text-muted)] transition hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] disabled:pointer-events-none disabled:opacity-30";
  const activeClass =
    "bg-[var(--ds-surface-hover)] text-[var(--ds-text)] ring-1 ring-[var(--ds-border)]";

  const [imageMenuOrigin, setImageMenuOrigin] = useState<{ x: number; y: number } | null>(null);
  const imageMenuTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      data-social-preview-editor-control="true"
      className="mt-6 flex w-8 shrink-0 flex-col items-center gap-1"
    >
      <button
        type="button"
        className={cx(buttonClass, activeTool === "text" && activeClass)}
        aria-label={messages.addText}
        title={messages.addText}
        onClick={onAddText}
      >
        <TextTIcon weight="duotone" className="size-5" />
      </button>
      <div className="relative">
        <button
          ref={imageMenuTriggerRef}
          type="button"
          className={cx(buttonClass, activeTool === "image" && activeClass)}
          aria-label={messages.addImage}
          title={messages.addImage}
          aria-haspopup="menu"
          aria-expanded={imageMenuOrigin !== null}
          onClick={(event) => {
            if (imageMenuOrigin) {
              setImageMenuOrigin(null);
              return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            setImageMenuOrigin({ x: rect.right + 8, y: rect.top });
          }}
        >
          <ImageIcon weight="duotone" className="size-5" />
        </button>
        <SubMenu
          autoFocus={false}
          open={imageMenuOrigin !== null}
          origin={imageMenuOrigin}
          onOpenChange={(open) => {
            if (!open) setImageMenuOrigin(null);
          }}
          triggerRef={imageMenuTriggerRef}
        >
          <SubMenu.Item
            icon={<ImagesIcon weight="duotone" className="size-4" />}
            onSelect={() => {
              setImageMenuOrigin(null);
              onAddImageFromAssets();
            }}
          >
            {messages.imageSourceAssets}
          </SubMenu.Item>
          <SubMenu.Item
            icon={<PlusIcon weight="duotone" className="size-4" />}
            onSelect={() => {
              setImageMenuOrigin(null);
              onAddImageFromComputer();
            }}
          >
            {messages.imageSourceComputer}
          </SubMenu.Item>
          <SubMenu.Item
            icon={<ImageIcon weight="duotone" className="size-4" />}
            onSelect={() => {
              setImageMenuOrigin(null);
              onAddImageFromUnsplash();
            }}
          >
            {messages.imageSourceUnsplash}
          </SubMenu.Item>
        </SubMenu>
      </div>
      <button
        type="button"
        className={cx(buttonClass, activeTool === "shape" && activeClass)}
        aria-label={messages.addShape}
        title={messages.addShape}
        onClick={onAddShape}
      >
        <HexagonIcon weight="duotone" className="size-5" />
      </button>
      <div className="my-0.5 h-px w-5 bg-[var(--ds-border-subtle)]" />
      <button
        type="button"
        className={buttonClass}
        aria-label="Undo"
        title="Undo"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <ArrowCounterClockwiseIcon weight="duotone" className="size-5" />
      </button>
      <button
        type="button"
        className={buttonClass}
        aria-label="Redo"
        title="Redo"
        disabled={!canRedo}
        onClick={onRedo}
      >
        <ArrowClockwiseIcon weight="duotone" className="size-5" />
      </button>
      <div className="my-0.5 h-px w-5 bg-[var(--ds-border-subtle)]" />
      <button
        type="button"
        className={cx(buttonClass, "hover:bg-red-500/10 hover:text-red-500")}
        aria-label={messages.deleteLayer}
        title={messages.deleteLayer}
        disabled={!hasLayerSelection}
        onClick={onDeleteLayer}
      >
        <TrashIcon weight="duotone" className="size-5" />
      </button>
    </div>
  );
}

function getShapeSvgPoints(layer: SocialPreviewShapeLayer) {
  const centerX = layer.width / 2;
  const centerY = layer.height / 2;
  const radius = Math.min(layer.radius, layer.width / 2, layer.height / 2);
  const count = layer.shape === "star" ? layer.points * 2 : layer.sides;
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    const pointRadius = layer.shape === "star" && index % 2 === 1 ? radius * 0.45 : radius;
    return `${centerX + Math.cos(angle) * pointRadius},${centerY + Math.sin(angle) * pointRadius}`;
  }).join(" ");
}

function ShapeLayerContent({ layer }: { layer: SocialPreviewShapeLayer }) {
  const strokeWidth = layer.border ? layer.borderThickness : 0;
  const strokeColor = layer.border ? layer.borderColor : "transparent";
  const strokeOpacity = layer.border ? layer.borderOpacity : 0;
  const inset = strokeWidth / 2;

  return (
    <svg
      className="size-full cursor-move overflow-visible"
      viewBox={`0 0 ${layer.width} ${layer.height}`}
    >
      {layer.shape === "rectangle" ? (
        <rect
          x={inset}
          y={inset}
          width={Math.max(0, layer.width - strokeWidth)}
          height={Math.max(0, layer.height - strokeWidth)}
          rx={Math.min(layer.cornerRadius, layer.width / 2, layer.height / 2)}
          fill={layer.color}
          stroke={strokeColor}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
        />
      ) : layer.shape === "circle" ? (
        <circle
          cx={layer.width / 2}
          cy={layer.height / 2}
          r={Math.max(0, Math.min(layer.radius, layer.width / 2, layer.height / 2) - inset)}
          fill={layer.color}
          stroke={strokeColor}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
        />
      ) : layer.shape === "ellipse" ? (
        <ellipse
          cx={layer.width / 2}
          cy={layer.height / 2}
          rx={Math.max(0, layer.width / 2 - inset)}
          ry={Math.max(0, layer.height / 2 - inset)}
          fill={layer.color}
          stroke={strokeColor}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
        />
      ) : (
        <polygon
          points={getShapeSvgPoints(layer)}
          fill={layer.color}
          stroke={strokeColor}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function TextLayerRichText({
  layer,
  style,
  textSelection,
  "aria-hidden": ariaHidden,
  onDoubleClick,
}: {
  layer: SocialPreviewTextLayer;
  style: CSSProperties;
  textSelection?: TextSelectionRange | null;
  "aria-hidden"?: boolean;
  onDoubleClick?: React.MouseEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      aria-hidden={ariaHidden}
      className="size-full cursor-move whitespace-pre-wrap break-words"
      style={style}
      onDoubleClick={onDoubleClick}
    >
      {renderTextWithStyleRanges(layer, textSelection)}
    </div>
  );
}

function LayerContent({
  layer,
  selected,
  editing,
  textSelection,
  onChange,
  onEditStart,
  onTextSelectionChange,
  onEditEnd,
}: {
  layer: SocialPreviewLayer;
  selected: boolean;
  editing: boolean;
  textSelection: TextSelectionRange | null;
  onChange: (patch: Partial<SocialPreviewLayer>) => void;
  onEditStart: () => void;
  onTextSelectionChange: (range: TextSelectionRange | null) => void;
  onEditEnd: () => void;
}) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (layer.type !== "text" || !editing) return;
    const frame = window.requestAnimationFrame(() => {
      textAreaRef.current?.focus();
      textAreaRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editing, layer.type]);

  if (layer.type === "text") {
    const textStyle: CSSProperties = {
      fontFamily: layer.fontFamily,
      fontSize: layer.fontSize,
      fontWeight: layer.fontWeight,
      fontStyle: layer.fontStyle,
      textDecoration: layer.textDecoration ?? "none",
      color: layer.color,
      textAlign: layer.align,
      lineHeight: layer.lineHeight,
      letterSpacing: layer.letterSpacing,
    };
    const editTextStyle: CSSProperties = {
      ...textStyle,
      caretColor: layer.color,
      color: "transparent",
      WebkitTextFillColor: "transparent",
    };

    return selected && editing ? (
      <div className="relative size-full">
        <TextLayerRichText
          layer={layer}
          style={textStyle}
          textSelection={textSelection}
          aria-hidden
        />
        <textarea
          ref={textAreaRef}
          aria-label="Edit text layer"
          className="absolute inset-0 size-full resize-none select-text overflow-hidden whitespace-pre-wrap break-words border-0 bg-transparent p-0 text-transparent outline-none selection:bg-transparent selection:text-transparent"
          style={editTextStyle}
          value={layer.text}
          onBlur={onEditEnd}
          onFocus={(event) => {
            event.currentTarget.select();
            onTextSelectionChange({
              layerId: layer.id,
              start: event.currentTarget.selectionStart,
              end: event.currentTarget.selectionEnd,
            });
          }}
          onSelect={(event) =>
            onTextSelectionChange({
              layerId: layer.id,
              start: event.currentTarget.selectionStart,
              end: event.currentTarget.selectionEnd,
            })
          }
          onChange={(event) => {
            onTextSelectionChange(null);
            onChange({ text: event.currentTarget.value });
          }}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
              event.preventDefault();
              onEditEnd();
            }
          }}
          onPointerDown={(event) => event.stopPropagation()}
          spellCheck={false}
        />
      </div>
    ) : (
      <TextLayerRichText
        layer={layer}
        style={textStyle}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onEditStart();
        }}
      />
    );
  }

  if (layer.type === "shape") {
    return <ShapeLayerContent layer={layer} />;
  }

  const imageTransform = `translate(${getImageOffsetX(layer)}px, ${getImageOffsetY(layer)}px) scale(${getImageZoom(layer)})`;
  const imageFilter = getImageFilter(layer);

  return (
    <div className="relative size-full overflow-hidden">
      <img
        src={layer.src}
        alt={layer.alt ?? ""}
        className="size-full object-cover"
        draggable={false}
        style={{ filter: imageFilter, transform: imageTransform }}
      />
      {getImageTintOpacity(layer) > 0 ? (
        <div
          className="pointer-events-none absolute inset-0 size-full"
          style={{
            backgroundColor: getImageTintColor(layer),
            maskImage: `url(${layer.src})`,
            maskPosition: "center",
            maskRepeat: "no-repeat",
            maskSize: "cover",
            opacity: getImageTintOpacity(layer),
            transform: imageTransform,
            WebkitMaskImage: `url(${layer.src})`,
            WebkitMaskPosition: "center",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "cover",
          }}
        />
      ) : null}
    </div>
  );
}

function SelectionFrame({
  layer,
  onResizePointerDown,
  onRotatePointerDown,
}: {
  layer: SocialPreviewLayer;
  onResizePointerDown: (
    event: React.PointerEvent<HTMLButtonElement>,
    layer: SocialPreviewLayer,
    handle: ResizeHandle,
  ) => void;
  onRotatePointerDown: (
    event: React.PointerEvent<HTMLButtonElement>,
    layer: SocialPreviewLayer,
  ) => void;
}) {
  return (
    <div className="pointer-events-none absolute -inset-1 border-2 border-sky-400 ring-4 ring-sky-400/20">
      <div className="absolute -top-7 left-1/2 h-7 w-px -translate-x-1/2 bg-sky-400" />
      <button
        type="button"
        aria-label="Rotate"
        className="pointer-events-auto absolute -top-10 left-1/2 size-5 -translate-x-1/2 rounded-full border-2 border-sky-400 bg-white shadow-md"
        onPointerDown={(event) => onRotatePointerDown(event, layer)}
      />
      {RESIZE_HANDLES.map((handle) => (
        <button
          key={handle}
          type="button"
          aria-label={`Resize ${handle}`}
          className={cx(
            "pointer-events-auto absolute size-4 rounded-full border-2 border-sky-400 bg-white shadow-md",
            handle.includes("n") && "-top-2",
            handle.includes("s") && "-bottom-2",
            handle.includes("w") && "-left-2",
            handle.includes("e") && "-right-2",
            handle === "n" && "left-1/2 -translate-x-1/2",
            handle === "s" && "left-1/2 -translate-x-1/2",
            handle === "e" && "top-1/2 -translate-y-1/2",
            handle === "w" && "top-1/2 -translate-y-1/2",
            RESIZE_HANDLE_CURSOR_CLASSES[handle],
          )}
          onPointerDown={(event) => onResizePointerDown(event, layer, handle)}
        />
      ))}
    </div>
  );
}

function Ruler({ axis, length }: { axis: "x" | "y"; length: number }) {
  const marks = Array.from({ length: Math.floor(length / 100) + 1 }, (_, index) => index * 100);

  if (axis === "x") {
    return (
      <div className="relative border-b border-white/10 bg-[#2b2f33] text-[9px] text-white/55">
        {marks.map((mark) => (
          <div
            key={mark}
            className="absolute bottom-0 h-full border-l border-white/25 leading-none"
            style={{ left: `${(mark / length) * 100}%` }}
          >
            <span className="absolute left-1 top-[calc(50%-5px)] -translate-y-1/2 tabular-nums">
              {mark}
            </span>
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 flex h-1 items-end justify-between px-1">
          {Array.from({ length: 49 }, (_, index) => (
            <span key={index} className="h-1 w-px bg-white/25" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative border-r border-white/10 bg-[#2b2f33] text-[9px] text-white/55">
      {marks.map((mark) => (
        <div
          key={mark}
          className="absolute right-0 w-full border-t border-white/25 pt-1 leading-none"
          style={{ top: `${(mark / length) * 100}%` }}
        >
          <span
            className="pointer-events-none absolute left-[calc(50%-5px)] block origin-center -translate-x-1/2 -rotate-90 whitespace-nowrap tabular-nums leading-none"
            style={{ top: `calc(${String(mark).length / 2}ch + 4px - 0.5em)` }}
          >
            {mark}
          </span>
        </div>
      ))}
      <div className="absolute inset-y-0 right-0 flex w-1 flex-col justify-between py-1">
        {Array.from({ length: 25 }, (_, index) => (
          <span key={index} className="h-px w-1 bg-white/25" />
        ))}
      </div>
    </div>
  );
}

function AttributeBar({
  messages,
  activeTool,
  selectedLayer,
  textSelection,
  onLayerChange,
  onDeleteLayer,
}: {
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  activeTool: ActiveTool;
  selectedLayer: SocialPreviewLayer | null;
  textSelection: TextSelectionRange | null;
  onLayerChange: (patch: Partial<SocialPreviewLayer>) => void;
  onDeleteLayer: () => void;
}) {
  const layerForTool = selectedLayer?.type === activeTool ? selectedLayer : null;

  return (
    <div
      data-social-preview-editor-control="true"
      className="flex h-[4.75rem] min-w-0 flex-1 flex-wrap content-center items-center gap-2 overflow-y-auto px-0 py-1.5 text-xs text-[var(--ds-text-muted)]"
    >
      {layerForTool ? (
        <LayerAttributes
          layer={layerForTool}
          messages={messages}
          textSelection={textSelection}
          onChange={onLayerChange}
          onDelete={onDeleteLayer}
        />
      ) : null}
    </div>
  );
}

function AttributeLabel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-1.5 whitespace-nowrap" title={title}>
      <span className="flex size-5 items-center justify-center text-[var(--ds-text-muted)]">
        {icon}
      </span>
      {children}
    </label>
  );
}

function AttributeInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "h-7 rounded border border-[var(--ds-border)] bg-[var(--ds-form-control-bg)] px-2 text-xs text-[var(--ds-text)] accent-[var(--color-primary)] outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]",
        className,
      )}
    />
  );
}

function AttributeSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        "h-7 rounded border border-[var(--ds-border)] bg-[var(--ds-form-control-bg)] px-2 text-xs text-[var(--ds-text)] outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]",
        className,
      )}
    />
  );
}

function AttributeDivider() {
  return <div className="h-5 w-px self-center bg-[var(--ds-border-subtle)]" />;
}

function LayerAttributes({
  layer,
  messages,
  textSelection,
  onChange,
  onDelete,
}: {
  layer: SocialPreviewLayer;
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  textSelection: TextSelectionRange | null;
  onChange: (patch: Partial<SocialPreviewLayer>) => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-1.5 whitespace-nowrap" title="Position">
        <span className="flex size-5 items-center justify-center text-[var(--ds-text-muted)]">
          <VectorTwoIcon weight="duotone" className="size-4" />
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[var(--ds-text-muted)]">X</span>
          <AttributeInput
            aria-label="X"
            type="number"
            value={Math.round(layer.x)}
            className="w-16"
            onChange={(event) => onChange({ x: Number(event.currentTarget.value) || 0 })}
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[var(--ds-text-muted)]">Y</span>
          <AttributeInput
            aria-label="Y"
            type="number"
            value={Math.round(layer.y)}
            className="w-16"
            onChange={(event) => onChange({ y: Number(event.currentTarget.value) || 0 })}
          />
        </div>
      </div>
      <AttributeLabel
        title={messages.width}
        icon={<ArrowsHorizontalIcon weight="duotone" className="size-4" />}
      >
        <AttributeInput
          aria-label={messages.width}
          type="number"
          min={1}
          value={Math.round(layer.width)}
          className="w-16"
          onChange={(event) =>
            onChange({ width: Math.max(1, Number(event.currentTarget.value) || 1) })
          }
        />
      </AttributeLabel>
      <AttributeLabel
        title={messages.height}
        icon={<ArrowsVerticalIcon weight="duotone" className="size-4" />}
      >
        <AttributeInput
          aria-label={messages.height}
          type="number"
          min={1}
          value={Math.round(layer.height)}
          className="w-16"
          onChange={(event) =>
            onChange({ height: Math.max(1, Number(event.currentTarget.value) || 1) })
          }
        />
      </AttributeLabel>
      <AttributeLabel
        title={messages.opacity}
        icon={<DropIcon weight="duotone" className="size-4" />}
      >
        <AttributeInput
          aria-label={messages.opacity}
          type="range"
          min={0}
          max={100}
          value={Math.round(layer.opacity * 100)}
          className="w-20 px-0"
          onChange={(event) =>
            onChange({ opacity: clamp((Number(event.currentTarget.value) || 0) / 100, 0, 1) })
          }
        />
      </AttributeLabel>
      <AttributeLabel
        title={messages.rotation}
        icon={<ArrowClockwiseIcon weight="duotone" className="size-4" />}
      >
        <AttributeInput
          aria-label={messages.rotation}
          type="number"
          value={formatRotation(layer.rotation)}
          className="w-16"
          onChange={(event) => onChange({ rotation: Number(event.currentTarget.value) || 0 })}
        />
      </AttributeLabel>
      {layer.type === "image" ? (
        <ImageLayerAttributes layer={layer} messages={messages} onChange={onChange} />
      ) : layer.type === "shape" ? (
        <ShapeLayerAttributes layer={layer} messages={messages} onChange={onChange} />
      ) : (
        <TextLayerAttributes
          layer={layer}
          messages={messages}
          textSelection={textSelection}
          onChange={onChange}
        />
      )}
      <AttributeDivider />
      <button
        type="button"
        className="flex size-7 items-center justify-center rounded text-[var(--ds-text-muted)] hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
        aria-label={messages.deleteLayer}
        title={messages.deleteLayer}
        onClick={onDelete}
      >
        <TrashIcon weight="duotone" className="size-4" />
      </button>
    </>
  );
}

const SHAPE_OPTIONS: Array<{
  value: SocialPreviewShapeKind;
  icon: React.ReactNode;
  labelKey: "shapeRectangle" | "shapeCircle" | "shapeEllipse" | "shapePolygon" | "shapeStar";
}> = [
  {
    value: "rectangle",
    icon: <RectangleIcon weight="duotone" className="size-4" />,
    labelKey: "shapeRectangle",
  },
  {
    value: "circle",
    icon: <CircleIcon weight="duotone" className="size-4" />,
    labelKey: "shapeCircle",
  },
  {
    value: "ellipse",
    icon: <CircleIcon weight="duotone" className="size-4 scale-x-125" />,
    labelKey: "shapeEllipse",
  },
  {
    value: "polygon",
    icon: <PolygonIcon weight="duotone" className="size-4" />,
    labelKey: "shapePolygon",
  },
  { value: "star", icon: <StarIcon weight="duotone" className="size-4" />, labelKey: "shapeStar" },
];

function ShapeLayerAttributes({
  layer,
  messages,
  onChange,
}: {
  layer: SocialPreviewShapeLayer;
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  onChange: (patch: Partial<SocialPreviewLayer>) => void;
}) {
  return (
    <>
      <span className="basis-full" aria-hidden="true" />
      <div className="flex items-center gap-1 self-center" title={messages.shapeKind}>
        {SHAPE_OPTIONS.map((option) => {
          const label = messages[option.labelKey];
          return (
            <button
              key={option.value}
              type="button"
              aria-label={label}
              title={label}
              className={cx(
                "flex size-7 items-center justify-center rounded text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
                layer.shape === option.value &&
                  "bg-[var(--ds-surface-hover)] text-[var(--ds-text)]",
              )}
              onClick={() => onChange({ shape: option.value })}
            >
              {option.icon}
            </button>
          );
        })}
      </div>
      {layer.shape === "rectangle" ? (
        <AttributeLabel
          title={messages.cornerRadius}
          icon={<CornersOutIcon weight="duotone" className="size-4" />}
        >
          <AttributeInput
            aria-label={messages.cornerRadius}
            type="number"
            min={0}
            value={Math.round(layer.cornerRadius)}
            className="w-16"
            onChange={(event) =>
              onChange({ cornerRadius: Math.max(0, Number(event.currentTarget.value) || 0) })
            }
          />
        </AttributeLabel>
      ) : null}
      {layer.shape !== "rectangle" && layer.shape !== "ellipse" ? (
        <AttributeLabel
          title={messages.radius}
          icon={<CircleIcon weight="duotone" className="size-4" />}
        >
          <AttributeInput
            aria-label={messages.radius}
            type="number"
            min={1}
            value={Math.round(layer.radius)}
            className="w-16"
            onChange={(event) =>
              onChange({ radius: Math.max(1, Number(event.currentTarget.value) || 1) })
            }
          />
        </AttributeLabel>
      ) : null}
      {layer.shape === "polygon" ? (
        <AttributeLabel
          title={messages.sides}
          icon={<PolygonIcon weight="duotone" className="size-4" />}
        >
          <AttributeInput
            aria-label={messages.sides}
            type="number"
            min={3}
            max={20}
            value={layer.sides}
            className="w-14"
            onChange={(event) =>
              onChange({ sides: clamp(Number(event.currentTarget.value) || 3, 3, 20) })
            }
          />
        </AttributeLabel>
      ) : null}
      {layer.shape === "star" ? (
        <AttributeLabel
          title={messages.points}
          icon={<StarIcon weight="duotone" className="size-4" />}
        >
          <AttributeInput
            aria-label={messages.points}
            type="number"
            min={3}
            max={20}
            value={layer.points}
            className="w-14"
            onChange={(event) =>
              onChange({ points: clamp(Number(event.currentTarget.value) || 3, 3, 20) })
            }
          />
        </AttributeLabel>
      ) : null}
      <AttributeLabel
        title={messages.textColor}
        icon={<PaletteIcon weight="duotone" className="size-4" />}
      >
        <AttributeInput
          aria-label={messages.textColor}
          type="color"
          value={layer.color}
          className="w-9 px-1"
          onChange={(event) => onChange({ color: event.currentTarget.value })}
        />
      </AttributeLabel>
      <AttributeLabel
        title={messages.border}
        icon={<BoundingBoxIcon weight="duotone" className="size-4" />}
      >
        <input
          aria-label={messages.border}
          type="checkbox"
          checked={layer.border}
          onChange={(event) => onChange({ border: event.currentTarget.checked })}
          className="size-4 accent-[var(--color-primary)]"
        />
      </AttributeLabel>
      <AttributeLabel
        title={messages.borderColor}
        icon={<PaletteIcon weight="duotone" className="size-4" />}
      >
        <AttributeInput
          aria-label={messages.borderColor}
          type="color"
          value={layer.borderColor}
          className="w-9 px-1"
          disabled={!layer.border}
          onChange={(event) => onChange({ borderColor: event.currentTarget.value })}
        />
      </AttributeLabel>
      <AttributeLabel
        title={messages.borderThickness}
        icon={<RulerIcon weight="duotone" className="size-4" />}
      >
        <AttributeInput
          aria-label={messages.borderThickness}
          type="number"
          min={0}
          value={Math.round(layer.borderThickness)}
          className="w-14"
          disabled={!layer.border}
          onChange={(event) =>
            onChange({ borderThickness: Math.max(0, Number(event.currentTarget.value) || 0) })
          }
        />
      </AttributeLabel>
      <AttributeLabel
        title={messages.borderOpacity}
        icon={<DropIcon weight="duotone" className="size-4" />}
      >
        <AttributeInput
          aria-label={messages.borderOpacity}
          type="range"
          min={0}
          max={100}
          value={Math.round(layer.borderOpacity * 100)}
          className="w-16 px-0"
          disabled={!layer.border}
          onChange={(event) =>
            onChange({ borderOpacity: clamp((Number(event.currentTarget.value) || 0) / 100, 0, 1) })
          }
        />
      </AttributeLabel>
    </>
  );
}

function ImageLayerAttributes({
  layer,
  messages,
  onChange,
}: {
  layer: SocialPreviewImageLayer;
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  onChange: (patch: Partial<SocialPreviewLayer>) => void;
}) {
  return (
    <>
      <AttributeLabel
        title={messages.backgroundZoom}
        icon={<CornersOutIcon weight="duotone" className="size-4" />}
      >
        <span className="w-9 text-right tabular-nums">{getImageZoom(layer).toFixed(2)}</span>
        <AttributeInput
          aria-label={messages.backgroundZoom}
          type="range"
          min={0.1}
          max={10}
          step={0.05}
          value={getImageZoom(layer)}
          className="w-24 px-0"
          onChange={(event) => onChange({ zoom: Number(event.currentTarget.value) || 1 })}
        />
      </AttributeLabel>
      <AttributeLabel
        title={messages.imageTintColor}
        icon={<PaletteIcon weight="duotone" className="size-4" />}
      >
        <AttributeInput
          aria-label={messages.imageTintColor}
          type="color"
          value={getImageTintColor(layer)}
          className="w-9 px-1"
          onChange={(event) => onChange({ tintColor: event.currentTarget.value })}
        />
      </AttributeLabel>
      <AttributeLabel
        title={messages.imageBrightness}
        icon={<SunDimIcon weight="duotone" className="size-4" />}
      >
        <span className="w-9 text-right tabular-nums">
          {Math.round(getImageBrightness(layer) * 100)}
        </span>
        <AttributeInput
          aria-label={messages.imageBrightness}
          type="range"
          min={0}
          max={200}
          value={Math.round(getImageBrightness(layer) * 100)}
          className="w-20 px-0"
          onChange={(event) =>
            onChange({ brightness: clamp((Number(event.currentTarget.value) || 0) / 100, 0, 2) })
          }
        />
      </AttributeLabel>
      <AttributeLabel
        title={messages.imageContrast}
        icon={<CircleHalfIcon weight="duotone" className="size-4" />}
      >
        <span className="w-9 text-right tabular-nums">
          {Math.round(getImageContrast(layer) * 100)}
        </span>
        <AttributeInput
          aria-label={messages.imageContrast}
          type="range"
          min={0}
          max={200}
          value={Math.round(getImageContrast(layer) * 100)}
          className="w-20 px-0"
          onChange={(event) =>
            onChange({ contrast: clamp((Number(event.currentTarget.value) || 0) / 100, 0, 2) })
          }
        />
      </AttributeLabel>
      <AttributeLabel
        title={messages.imageTintOpacity}
        icon={<DropIcon weight="duotone" className="size-4" />}
      >
        <span className="w-8 text-right tabular-nums">
          {Math.round(getImageTintOpacity(layer) * 100)}
        </span>
        <AttributeInput
          aria-label={messages.imageTintOpacity}
          type="range"
          min={0}
          max={100}
          value={Math.round(getImageTintOpacity(layer) * 100)}
          className="w-20 px-0"
          onChange={(event) =>
            onChange({ tintOpacity: clamp((Number(event.currentTarget.value) || 0) / 100, 0, 1) })
          }
        />
      </AttributeLabel>
    </>
  );
}

function TextLayerAttributes({
  layer,
  messages,
  textSelection,
  onChange,
}: {
  layer: SocialPreviewTextLayer;
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  textSelection: TextSelectionRange | null;
  onChange: (patch: Partial<SocialPreviewLayer>) => void;
}) {
  const selectionStyle = getTextSelectionStyleState(layer, textSelection);
  const activeStyle = selectionStyle.style;

  return (
    <>
      <span className="basis-full" aria-hidden="true" />
      <AttributeLabel
        title={messages.fontFamily}
        icon={<TextTIcon weight="duotone" className="size-4" />}
      >
        <AttributeSelect
          aria-label={messages.fontFamily}
          value={activeStyle.fontFamily}
          className="w-44"
          onChange={(event) => onChange({ fontFamily: event.currentTarget.value })}
        >
          {FONT_OPTIONS.map((option) => (
            <option key={option.label} value={option.value} style={{ fontFamily: option.value }}>
              {option.label}
            </option>
          ))}
        </AttributeSelect>
      </AttributeLabel>
      <AttributeLabel
        title={messages.fontSize}
        icon={<RulerIcon weight="duotone" className="size-4" />}
      >
        <AttributeInput
          aria-label={messages.fontSize}
          type="number"
          min={1}
          value={activeStyle.fontSize}
          className="w-14"
          onChange={(event) =>
            onChange({ fontSize: Math.max(1, Number(event.currentTarget.value) || 1) })
          }
        />
      </AttributeLabel>
      <AttributeLabel
        title={messages.textColor}
        icon={<PaletteIcon weight="duotone" className="size-4" />}
      >
        <AttributeInput
          aria-label={messages.textColor}
          type="color"
          value={activeStyle.color}
          className="w-9 px-1"
          onChange={(event) => onChange({ color: event.currentTarget.value })}
        />
      </AttributeLabel>
      <button
        type="button"
        aria-label={messages.fontWeight}
        aria-pressed={selectionStyle.fontWeight === "on"}
        title={messages.fontWeight}
        className={cx(
          "flex size-7 items-center justify-center rounded text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
          selectionStyle.fontWeight === "on" &&
            "bg-[var(--ds-surface-hover)] text-[var(--ds-text)]",
        )}
        onClick={() => onChange({ fontWeight: selectionStyle.fontWeight === "on" ? "400" : "700" })}
      >
        <TextBIcon weight="duotone" className="size-4" />
      </button>
      <button
        type="button"
        aria-label={messages.fontStyle}
        aria-pressed={selectionStyle.fontStyle === "on"}
        title={messages.fontStyle}
        className={cx(
          "flex size-7 items-center justify-center rounded text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
          selectionStyle.fontStyle === "on" && "bg-[var(--ds-surface-hover)] text-[var(--ds-text)]",
        )}
        onClick={() =>
          onChange({ fontStyle: selectionStyle.fontStyle === "on" ? "normal" : "italic" })
        }
      >
        <TextItalicIcon weight="duotone" className="size-4" />
      </button>
      <button
        type="button"
        aria-label={messages.fontUnderline}
        aria-pressed={selectionStyle.textDecoration === "on"}
        title={messages.fontUnderline}
        className={cx(
          "flex size-7 items-center justify-center rounded text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
          selectionStyle.textDecoration === "on" &&
            "bg-[var(--ds-surface-hover)] text-[var(--ds-text)]",
        )}
        onClick={() =>
          onChange({
            textDecoration: selectionStyle.textDecoration === "on" ? "none" : "underline",
          })
        }
      >
        <TextUnderlineIcon weight="duotone" className="size-4" />
      </button>
      <div className="flex items-center gap-1" title={messages.align}>
        <button
          type="button"
          aria-label={messages.alignLeft}
          className={cx(
            "flex size-7 items-center justify-center rounded text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
            layer.align === "left" && "bg-[var(--ds-surface-hover)] text-[var(--ds-text)]",
          )}
          onClick={() => onChange({ align: "left" })}
        >
          <TextAlignLeftIcon weight="duotone" className="size-4" />
        </button>
        <button
          type="button"
          aria-label={messages.alignCenter}
          className={cx(
            "flex size-7 items-center justify-center rounded text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
            layer.align === "center" && "bg-[var(--ds-surface-hover)] text-[var(--ds-text)]",
          )}
          onClick={() => onChange({ align: "center" })}
        >
          <TextAlignCenterIcon weight="duotone" className="size-4" />
        </button>
        <button
          type="button"
          aria-label={messages.alignRight}
          className={cx(
            "flex size-7 items-center justify-center rounded text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
            layer.align === "right" && "bg-[var(--ds-surface-hover)] text-[var(--ds-text)]",
          )}
          onClick={() => onChange({ align: "right" })}
        >
          <TextAlignRightIcon weight="duotone" className="size-4" />
        </button>
      </div>
      <AttributeLabel
        title={messages.lineHeight}
        icon={<ArrowsOutLineVerticalIcon weight="duotone" className="size-4" />}
      >
        <AttributeInput
          aria-label={messages.lineHeight}
          type="number"
          min={0.5}
          max={4}
          step={0.05}
          value={activeStyle.lineHeight}
          className="w-14"
          onChange={(event) => onChange({ lineHeight: Number(event.currentTarget.value) || 1 })}
        />
      </AttributeLabel>
      <AttributeLabel
        title={messages.letterSpacing}
        icon={<ArrowsOutLineHorizontalIcon weight="duotone" className="size-4" />}
      >
        <AttributeInput
          aria-label={messages.letterSpacing}
          type="number"
          value={activeStyle.letterSpacing}
          className="w-14"
          onChange={(event) => onChange({ letterSpacing: Number(event.currentTarget.value) || 0 })}
        />
      </AttributeLabel>
    </>
  );
}
