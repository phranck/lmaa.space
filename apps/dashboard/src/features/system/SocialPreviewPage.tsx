import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowSquareOutIcon,
  ArrowsOutCardinalIcon,
  FileTextIcon,
  BoundingBoxIcon,
  CheckCircleIcon,
  CircleIcon,
  CornersOutIcon,
  DropIcon,
  FrameCornersIcon,
  HexagonIcon,
  ImageIcon,
  PaletteIcon,
  PlusIcon,
  PolygonIcon,
  RectangleIcon,
  RulerIcon,
  SelectionIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  StarIcon,
  TextBIcon,
  TextItalicIcon,
  TextTIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import type {
  SocialPreviewComposition,
  SocialPreviewFormat,
  SocialPreviewImageLayer,
  SocialPreviewLayer,
  SocialPreviewProjectEntry,
  SocialPreviewShapeKind,
  SocialPreviewShapeLayer,
  SocialPreviewTextLayer,
} from "@lmaa/contracts";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { DeleteActionButton, SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog.tsx";
import { PageFooter } from "@/components/ui/PageFooter.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { DataTable, type ColumnDef } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { UnsplashBrowser } from "@/components/ui/UnsplashBrowser.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useCreateSocialPreviewImage,
  useCreateSocialPreviewProject,
  useDeleteSocialPreviewImage,
  useDeleteSocialPreviewProject,
  useSetActiveSocialPreviewImage,
  useSocialPreviewImages,
  useSocialPreviewProjects,
  useUpdateSocialPreviewProject,
  useUploadSocialPreviewAsset,
} from "@/features/system/hooks/useSocialPreviewImages.ts";
import {
  createEmptySocialPreviewComposition,
  createImageLayer,
  createShapeLayer,
  createTextLayer,
  formatBytes,
  renderSocialPreviewBlob,
} from "@/features/system/social-preview-renderer.ts";

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

const RESIZE_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
type ResizeHandle = (typeof RESIZE_HANDLES)[number];

type SelectionTarget = { type: "background" } | { type: "layer"; id: string } | null;
type ActiveTool = "background" | "text" | "image" | "shape";

type DragState =
  | {
      mode: "background-pan";
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    }
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

type TextStylePatch = Partial<
  Pick<
    SocialPreviewTextLayer,
    | "fontFamily"
    | "fontSize"
    | "fontWeight"
    | "fontStyle"
    | "color"
    | "lineHeight"
    | "letterSpacing"
  >
>;

const TEXT_STYLE_KEYS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
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
    if (range.color !== undefined) style.color = range.color;
    if (range.lineHeight !== undefined) style.lineHeight = range.lineHeight;
    if (range.letterSpacing !== undefined) style.letterSpacing = range.letterSpacing;
  }

  return style;
}

function renderTextWithStyleRanges(layer: SocialPreviewTextLayer) {
  return Array.from(layer.text).map((char, index) => {
    const style = getTextStyleAt(layer, index);
    return (
      <span
        key={`${index}-${char}`}
        style={{
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          fontStyle: style.fontStyle,
          color: style.color,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
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

function applyTextStyleRange(
  layer: SocialPreviewTextLayer,
  start: number,
  end: number,
  patch: TextStylePatch,
): SocialPreviewTextLayer {
  const safeStart = clamp(Math.min(start, end), 0, layer.text.length);
  const safeEnd = clamp(Math.max(start, end), 0, layer.text.length);
  if (safeStart === safeEnd) return layer;

  return {
    ...layer,
    styleRanges: [
      ...(layer.styleRanges ?? []),
      {
        start: safeStart,
        end: safeEnd,
        ...patch,
      },
    ].slice(-400),
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
  const { messages, locale } = useI18n();
  const t = messages.system.socialPreview;
  const common = messages.common;

  const { data: savedProjects = [], isLoading: isLoadingProjects } = useSocialPreviewProjects();
  const { data: savedImages = [], isLoading } = useSocialPreviewImages();
  const createProject = useCreateSocialPreviewProject();
  const updateProject = useUpdateSocialPreviewProject();
  const deleteProject = useDeleteSocialPreviewProject();
  const uploadPreview = useUploadSocialPreviewAsset();
  const createPreview = useCreateSocialPreviewImage();
  const setActivePreview = useSetActiveSocialPreviewImage();
  const deletePreview = useDeleteSocialPreviewImage();

  const [composition, setComposition] = useState<SocialPreviewComposition>(() =>
    createEmptySocialPreviewComposition(),
  );
  const [selection, setSelection] = useState<SelectionTarget>(null);
  const [activeTool, setActiveTool] = useState<ActiveTool>("background");
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);
  const [textSelection, setTextSelection] = useState<TextSelectionRange | null>(null);
  const [browserMode, setBrowserMode] = useState<"background" | "layer" | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [format, setFormat] = useState<SocialPreviewFormat>("image/jpeg");
  const [quality, setQuality] = useState(90);
  const targetSizeKb = 350;
  const [name, setName] = useState("Social Media Preview");
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [effectiveQuality, setEffectiveQuality] = useState(90);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteProjectTargetId, setDeleteProjectTargetId] = useState<number | null>(null);
  const [imageGridSize, setImageGridSize] = useState(() => {
    const stored = window.localStorage.getItem("social-preview-export-grid-size");
    const value = stored ? Number(stored) : 3;
    return Number.isFinite(value) ? clamp(value, 1, 4) : 3;
  });
  const [stageScale, setStageScale] = useState(1);

  const stageRef = useRef<HTMLDivElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
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
  const isBackgroundSelected = selection?.type === "background";
  const canUndo = historyRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
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
    window.localStorage.setItem("social-preview-export-grid-size", String(imageGridSize));
  }, [imageGridSize]);

  useEffect(() => {
    function handleDocumentKeyDown(event: KeyboardEvent) {
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

      if ((event.key === "Backspace" || event.key === "Delete") && selectedLayer) {
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

    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => document.removeEventListener("keydown", handleDocumentKeyDown);
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

  function selectUnsplashAsBackground(url: string) {
    commitComposition((current) => ({
      ...current,
      background: { ...current.background, src: url, zoom: 1, offsetX: 0, offsetY: 0 },
    }));
    setSelection({ type: "background" });
    setActiveTool("background");
    setEditingTextLayerId(null);
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

  function handleStagePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const stage = stageRef.current;
    if (!stage || !composition.background.src) {
      setSelection(null);
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const position = getPointerPosition(event, stage);
    setSelection({ type: "background" });
    setActiveTool("background");
    setEditingTextLayerId(null);
    pushHistorySnapshot();
    setDragState({
      mode: "background-pan",
      startX: position.x,
      startY: position.y,
      originX: composition.background.offsetX,
      originY: composition.background.offsetY,
    });
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
    if (!stage) return;
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
    if (!stage) return;
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

    if (dragState.mode === "background-pan") {
      setComposition((current) => ({
        ...current,
        background: {
          ...current.background,
          offsetX: dragState.originX + position.x - dragState.startX,
          offsetY: dragState.originY + position.y - dragState.startY,
        },
      }));
      return;
    }

    if (dragState.mode === "layer-rotate") {
      const angle = getPointerAngle(event, stage, dragState.centerX, dragState.centerY);
      setComposition((current) =>
        updateLayer(current, dragState.id, {
          rotation: dragState.originRotation + angle - dragState.startAngle,
        }),
      );
      return;
    }

    const active = composition.layers.find((layer) => layer.id === dragState.id);
    if (!active) return;

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
    if (isBackgroundSelected || (!selectedLayer && composition.background.src)) {
      event.preventDefault();
      setSelection({ type: "background" });
      setActiveTool("background");
      setEditingTextLayerId(null);
      commitComposition((current) => ({
        ...current,
        background: {
          ...current.background,
          zoom: clamp(current.background.zoom + delta, 0.1, 10),
        },
      }));
      return;
    }

    if (selectedLayer?.type === "image") {
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

    if (selection.type === "background") {
      commitComposition((current) => ({
        ...current,
        background: {
          ...current.background,
          offsetX: current.background.offsetX + delta[0],
          offsetY: current.background.offsetY + delta[1],
        },
      }));
      return;
    }

    commitComposition((current) => {
      const active = current.layers.find((layer) => layer.id === selection.id);
      if (!active) return current;
      return updateLayer(current, selection.id, {
        x: active.x + delta[0],
        y: active.y + delta[1],
      });
    });
  }

  function updateSelectedLayer(patch: Partial<SocialPreviewLayer>) {
    if (!selectedLayer) return;
    commitComposition((current) => {
      if (selectedLayer.type === "text" && "text" in patch) {
        return updateLayer(current, selectedLayer.id, {
          ...patch,
          colorRanges: [],
          styleRanges: [],
        });
      }

      if (selectedLayer.type === "text" && hasTextStylePatch(patch)) {
        if (
          textSelection?.layerId !== selectedLayer.id ||
          textSelection.start === textSelection.end
        ) {
          return current;
        }
        const layer = current.layers.find((entry) => entry.id === selectedLayer.id);
        if (layer?.type !== "text") return current;
        return updateLayer(
          current,
          selectedLayer.id,
          applyTextStyleRange(
            layer,
            textSelection.start,
            textSelection.end,
            pickTextStylePatch(patch),
          ),
        );
      }

      return updateLayer(current, selectedLayer.id, patch);
    });
  }

  function deleteSelectedLayer() {
    if (!selectedLayer) return;
    commitComposition((current) => removeLayer(current, selectedLayer.id));
    setSelection(null);
    setEditingTextLayerId(null);
  }

  function handleLoadProject(project: SocialPreviewProjectEntry) {
    pushHistorySnapshot();
    setComposition(project.composition);
    setCurrentProjectId(project.id);
    setName(project.name);
    setSelection(null);
    setEditingTextLayerId(null);
  }

  async function handleSaveProject() {
    if (currentProjectId) {
      await updateProject.mutateAsync({
        id: currentProjectId,
        data: { name, composition },
      });
      return;
    }

    const project = await createProject.mutateAsync({ name, composition });
    setCurrentProjectId(project.id);
  }

  async function handleSave() {
    const rendered = previewBlob
      ? { blob: previewBlob, effectiveQuality }
      : await renderSocialPreviewBlob(
          composition,
          format,
          quality,
          targetSizeKb > 0 ? targetSizeKb * 1024 : null,
        );
    const media = await uploadPreview.mutateAsync({ blob: rendered.blob, name });
    await createPreview.mutateAsync({
      name,
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
  const isSavingProject = createProject.isPending || updateProject.isPending;
  const savedImageCardWidth = 150 + ((imageGridSize - 1) / 3) * 270;
  const projectColumns = useMemo<Array<ColumnDef<SocialPreviewProjectEntry>>>(
    () => [
      {
        id: "name",
        header: t.nameLabel,
        sortKey: (project) => project.name,
        cell: (project) => (
          <span className="block max-w-[16rem] truncate font-medium text-[var(--ds-text)]">
            {project.name}
          </span>
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
              onClick={() => handleLoadProject(project)}
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
    [common.delete, deleteProject.isPending, locale, t.loadProject, t.nameLabel, t.updatedAtLabel],
  );

  return (
    <PageLayout>
      <PageHeader title={t.title} />
      <PageBody className="min-h-0 overflow-y-auto">
        <div className="space-y-4">
          <DashboardSection>
            <DashboardSection.Header
              icon={<SelectionIcon weight="duotone" className="size-4" />}
              title={t.editorTitle}
            />
            <DashboardSection.Body>
              <div className="flex items-start gap-2">
                <CanvasToolbar
                  messages={t}
                  activeTool={activeTool}
                  hasLayerSelection={selectedLayer !== null}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={undoComposition}
                  onRedo={redoComposition}
                  onChooseBackground={() => {
                    setActiveTool("background");
                    setSelection({ type: "background" });
                    setBrowserMode("background");
                  }}
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

                <div className="min-w-0 flex-1">
                  <AttributeBar
                    messages={t}
                    activeTool={activeTool}
                    composition={composition}
                    selectedLayer={selectedLayer}
                    textSelection={textSelection}
                    onBackgroundChange={(patch) =>
                      commitComposition((current) => ({
                        ...current,
                        background: { ...current.background, ...patch },
                      }))
                    }
                    onLayerChange={updateSelectedLayer}
                    onDeleteLayer={deleteSelectedLayer}
                  />
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
                        isBackgroundSelected ? "ring-4 ring-sky-400/20" : null,
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
                        {composition.background.src ? (
                          <img
                            src={composition.background.src}
                            alt=""
                            className="absolute inset-0 size-full object-cover"
                            draggable={false}
                            style={{
                              transform: `translate(${composition.background.offsetX}px, ${composition.background.offsetY}px) scale(${composition.background.zoom})`,
                            }}
                          />
                        ) : null}

                        {composition.layers.map((layer) => {
                          const selected = selectedLayer?.id === layer.id;
                          return (
                            <div
                              key={layer.id}
                              className={cx("absolute select-none", selected ? "z-20" : "z-10")}
                              style={renderLayerStyle(layer)}
                              onPointerDown={(event) => handleLayerPointerDown(event, layer)}
                              onDoubleClick={(event) => {
                                if (layer.type !== "text") return;
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
                                onChange={updateSelectedLayer}
                                onEditStart={() => {
                                  if (layer.type === "text") {
                                    setEditingTextLayerId(layer.id);
                                  }
                                }}
                                onTextSelectionChange={(range) => setTextSelection(range)}
                                onEditEnd={() => {
                                  setEditingTextLayerId(null);
                                }}
                              />
                              {selected ? (
                                <SelectionFrame
                                  layer={layer}
                                  onResizePointerDown={handleResizePointerDown}
                                  onRotatePointerDown={handleRotatePointerDown}
                                />
                              ) : null}
                            </div>
                          );
                        })}

                        {isBackgroundSelected ? (
                          <div className="pointer-events-none absolute inset-3 border-2 border-sky-400 ring-4 ring-sky-400/20" />
                        ) : null}

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
              </div>
            </DashboardSection.Body>
          </DashboardSection>

          <div className="grid auto-rows-[32rem] items-stretch gap-4 xl:grid-cols-2">
            <DashboardSection className="flex h-full min-h-0 flex-col">
              <DashboardSection.Header
                icon={<SelectionIcon weight="duotone" className="size-4" />}
                title={t.savedProjectsTitle}
              />
              <DashboardSection.Body className="min-h-0 flex-1 overflow-y-auto !gap-0 !p-0">
                {isLoadingProjects ? (
                  <p className="text-sm text-[var(--ds-text-muted)]">{common.loading}</p>
                ) : savedProjects.length === 0 ? (
                  <p className="text-sm text-[var(--ds-text-muted)]">{t.emptyHint}</p>
                ) : (
                  <div className="social-preview-projects-table">
                    <DataTable
                      columns={projectColumns}
                      data={savedProjects}
                      getRowKey={(project) => project.id}
                      getRowClassName={(project) =>
                        currentProjectId === project.id
                          ? "ring-2 ring-inset ring-[var(--color-primary)]/40"
                          : ""
                      }
                      initialSort={{ id: "updatedAt", dir: "desc" }}
                    />
                  </div>
                )}
              </DashboardSection.Body>
            </DashboardSection>

            <DashboardSection className="flex h-full min-h-0 flex-col">
              <DashboardSection.Header
                icon={<ImageIcon weight="duotone" className="size-4" />}
                title={t.savedTitle}
                addOn={
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
                    {savedImages.map((image) => (
                      <div
                        key={image.id}
                        className="group relative overflow-hidden rounded-[12px] border border-[var(--ds-border)] bg-[var(--ds-surface)]"
                      >
                        <img
                          src={image.imageUrl}
                          alt=""
                          className="aspect-[1200/630] w-full object-cover"
                        />
                        {image.isActive ? (
                          <span
                            className="absolute left-1 top-1 z-10 inline-flex items-center gap-1 border border-emerald-300/30 bg-emerald-400/25 px-2 py-0.5 text-xs font-medium text-emerald-50 backdrop-blur"
                            style={{
                              borderRadius: "8px",
                            }}
                          >
                            <CheckCircleIcon weight="duotone" className="size-3.5" />
                            {t.activeBadge}
                          </span>
                        ) : null}
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
                            style={{
                              borderRadius: "8px",
                            }}
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
                              style={{
                                borderRadius: "8px",
                              }}
                            >
                              <ArrowSquareOutIcon weight="duotone" className="size-3.5" />
                            </a>
                            <button
                              type="button"
                              aria-label={t.setActive}
                              title={t.setActive}
                              disabled={image.isActive || setActivePreview.isPending}
                              onClick={() =>
                                setActivePreview.mutate({ id: image.id, active: true })
                              }
                              className="flex size-7 items-center justify-center border border-emerald-300/35 bg-emerald-500/20 text-emerald-50 backdrop-blur hover:bg-emerald-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] disabled:pointer-events-none disabled:opacity-50"
                              style={{
                                borderRadius: "8px",
                              }}
                            >
                              <CheckCircleIcon weight="duotone" className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DashboardSection.Body>
            </DashboardSection>
          </div>
        </div>
      </PageBody>

      <PageFooter>
        <FooterExportControls
          messages={t}
          commonMessages={common}
          name={name}
          format={format}
          quality={quality}
          isSaving={isSaving}
          isSavingProject={isSavingProject}
          canSave={!!previewBlob && !renderError && !!name.trim()}
          canSaveProject={!!name.trim()}
          estimatedSizeBytes={previewBlob?.size ?? null}
          onNameChange={setName}
          onFormatChange={setFormat}
          onQualityChange={setQuality}
          onSaveProject={() => void handleSaveProject()}
          onSave={() => void handleSave()}
        />
      </PageFooter>

      {browserMode ? (
        <UnsplashBrowser
          defaultQuery=""
          onSelect={(photo) => {
            void (async () => {
              if (browserMode === "background") {
                selectUnsplashAsBackground(photo.url);
              } else {
                await addImageLayer(photo.url, photo.altDescription);
              }
              setBrowserMode(null);
            })();
          }}
          onClose={() => setBrowserMode(null)}
        />
      ) : null}

      <DeleteConfirmDialog
        open={deleteProjectTargetId !== null}
        title={t.deleteConfirmTitle}
        description={t.deleteConfirmDescription}
        cancelLabel={common.cancel}
        deleteLabel={common.delete}
        isPending={deleteProject.isPending}
        onClose={() => setDeleteProjectTargetId(null)}
        onConfirm={() => {
          if (deleteProjectTargetId === null) return;
          deleteProject.mutate(deleteProjectTargetId, {
            onSuccess: () => {
              if (currentProjectId === deleteProjectTargetId) {
                setCurrentProjectId(null);
              }
              setDeleteProjectTargetId(null);
            },
          });
        }}
      />

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
    </PageLayout>
  );
}

function FooterExportControls({
  messages,
  commonMessages,
  name,
  format,
  quality,
  isSaving,
  isSavingProject,
  canSave,
  canSaveProject,
  estimatedSizeBytes,
  onNameChange,
  onFormatChange,
  onQualityChange,
  onSaveProject,
  onSave,
}: {
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  commonMessages: ReturnType<typeof useI18n>["messages"]["common"];
  name: string;
  format: SocialPreviewFormat;
  quality: number;
  isSaving: boolean;
  isSavingProject: boolean;
  canSave: boolean;
  canSaveProject: boolean;
  estimatedSizeBytes: number | null;
  onNameChange: (value: string) => void;
  onFormatChange: (value: SocialPreviewFormat) => void;
  onQualityChange: (value: number) => void;
  onSaveProject: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-[var(--ds-text-muted)]">
          {messages.nameLabel}
          <input
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.currentTarget.value)}
            className="h-8 w-52 rounded-control border border-[var(--ds-border)] bg-[var(--ds-form-control-bg)] px-2 text-sm text-[var(--ds-text)] outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]"
          />
        </label>
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
      <div className="flex items-center gap-2">
        <SaveActionButton
          label={isSavingProject ? commonMessages.saving : messages.saveProject}
          disabled={isSavingProject || !canSaveProject}
          busy={isSavingProject}
          onClick={onSaveProject}
        />
        <SaveActionButton
          label={isSaving ? commonMessages.saving : messages.saveAndActivate}
          disabled={isSaving || !canSave}
          busy={isSaving}
          onClick={onSave}
        />
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
  onChooseBackground,
  onAddText,
  onAddImageFromUnsplash,
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
  onChooseBackground: () => void;
  onAddText: () => void;
  onAddImageFromUnsplash: () => void;
  onAddImageFromComputer: () => void;
  onAddShape: () => void;
  onDeleteLayer: () => void;
}) {
  const buttonClass =
    "flex size-8 items-center justify-center rounded-md text-[var(--ds-text-muted)] transition hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] disabled:pointer-events-none disabled:opacity-30";
  const activeClass =
    "bg-[var(--ds-surface-hover)] text-[var(--ds-text)] ring-1 ring-[var(--ds-border)]";

  const [imageMenuOpen, setImageMenuOpen] = useState(false);

  return (
    <div className="flex w-8 shrink-0 flex-col items-center gap-1 pt-12">
      <button
        type="button"
        className={cx(buttonClass, activeTool === "background" && activeClass)}
        aria-label={messages.chooseBackground}
        title={messages.chooseBackground}
        onClick={onChooseBackground}
      >
        <ImageIcon weight="duotone" className="size-5" />
      </button>
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
          type="button"
          className={cx(buttonClass, activeTool === "image" && activeClass)}
          aria-label={messages.addImage}
          title={messages.addImage}
          aria-haspopup="menu"
          aria-expanded={imageMenuOpen}
          onClick={() => setImageMenuOpen((open) => !open)}
        >
          <PlusIcon weight="duotone" className="size-5" />
        </button>
        {imageMenuOpen ? (
          <div
            role="menu"
            className="absolute left-10 top-0 z-50 min-w-36 overflow-hidden rounded-control border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1 text-xs text-[var(--ds-text)] shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[var(--ds-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
              onClick={() => {
                setImageMenuOpen(false);
                onAddImageFromUnsplash();
              }}
            >
              <ImageIcon weight="duotone" className="size-4" />
              {messages.imageSourceUnsplash}
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[var(--ds-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
              onClick={() => {
                setImageMenuOpen(false);
                onAddImageFromComputer();
              }}
            >
              <PlusIcon weight="duotone" className="size-4" />
              {messages.imageSourceComputer}
            </button>
          </div>
        ) : null}
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

function LayerContent({
  layer,
  selected,
  editing,
  onChange,
  onEditStart,
  onTextSelectionChange,
  onEditEnd,
}: {
  layer: SocialPreviewLayer;
  selected: boolean;
  editing: boolean;
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
      color: layer.color,
      textAlign: layer.align,
      lineHeight: layer.lineHeight,
      letterSpacing: layer.letterSpacing,
    };

    return selected && editing ? (
      <textarea
        ref={textAreaRef}
        className="size-full resize-none overflow-hidden whitespace-pre-wrap break-words border-0 bg-transparent p-0 outline-none"
        style={textStyle}
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
          if (event.key === "Escape") {
            event.preventDefault();
            onEditEnd();
          }
        }}
        onPointerDown={(event) => event.stopPropagation()}
        spellCheck={false}
      />
    ) : (
      <div
        className="size-full cursor-move whitespace-pre-wrap break-words"
        style={textStyle}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onEditStart();
        }}
      >
        {renderTextWithStyleRanges(layer)}
      </div>
    );
  }

  if (layer.type === "shape") {
    return <ShapeLayerContent layer={layer} />;
  }

  const imageTransform = `translate(${getImageOffsetX(layer)}px, ${getImageOffsetY(layer)}px) scale(${getImageZoom(layer)})`;

  return (
    <div className="relative size-full overflow-hidden">
      <img
        src={layer.src}
        alt={layer.alt ?? ""}
        className="size-full object-cover"
        draggable={false}
        style={{ transform: imageTransform }}
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
  composition,
  selectedLayer,
  textSelection,
  onBackgroundChange,
  onLayerChange,
  onDeleteLayer,
}: {
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  activeTool: ActiveTool;
  composition: SocialPreviewComposition;
  selectedLayer: SocialPreviewLayer | null;
  textSelection: TextSelectionRange | null;
  onBackgroundChange: (patch: Partial<SocialPreviewComposition["background"]>) => void;
  onLayerChange: (patch: Partial<SocialPreviewLayer>) => void;
  onDeleteLayer: () => void;
}) {
  const layerForTool = selectedLayer?.type === activeTool ? selectedLayer : null;

  return (
    <div className="mb-2 flex h-[4.75rem] flex-wrap content-start items-start gap-2 overflow-y-auto px-0 py-1.5 text-xs text-[var(--ds-text-muted)]">
      {activeTool === "background" ? (
        <BackgroundAttributes
          messages={messages}
          composition={composition}
          onChange={onBackgroundChange}
        />
      ) : layerForTool ? (
        <LayerAttributes
          layer={layerForTool}
          messages={messages}
          textSelection={textSelection}
          onChange={onLayerChange}
          onDelete={onDeleteLayer}
        />
      ) : (
        <span>{messages.noSelection}</span>
      )}
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
  return <div className="h-5 w-px bg-[var(--ds-border-subtle)]" />;
}

function BackgroundAttributes({
  messages,
  composition,
  onChange,
}: {
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  composition: SocialPreviewComposition;
  onChange: (patch: Partial<SocialPreviewComposition["background"]>) => void;
}) {
  return (
    <>
      <span
        title={messages.chooseBackground}
        className="flex size-7 items-center justify-center text-[var(--ds-text)]"
      >
        <ImageIcon weight="duotone" className="size-4" />
      </span>
      <AttributeDivider />
      <AttributeLabel
        title={messages.backgroundColor}
        icon={<PaletteIcon weight="duotone" className="size-4" />}
      >
        <AttributeInput
          aria-label={messages.backgroundColor}
          type="color"
          value={composition.background.color}
          className="w-9 px-1"
          onChange={(event) => onChange({ color: event.currentTarget.value })}
        />
      </AttributeLabel>
      <AttributeLabel
        title={messages.backgroundZoom}
        icon={<CornersOutIcon weight="duotone" className="size-4" />}
      >
        <span className="w-9 text-right tabular-nums">
          {composition.background.zoom.toFixed(2)}
        </span>
        <AttributeInput
          aria-label={messages.backgroundZoom}
          type="range"
          min={0.1}
          max={10}
          step={0.05}
          value={composition.background.zoom}
          className="w-32 px-0"
          onChange={(event) => onChange({ zoom: Number(event.currentTarget.value) || 1 })}
        />
      </AttributeLabel>
    </>
  );
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
      <span
        title={
          layer.type === "text"
            ? messages.textLayer
            : layer.type === "image"
              ? messages.imageLayer
              : messages.shapeLayer
        }
        className="flex size-7 items-center justify-center text-[var(--ds-text)]"
      >
        {layer.type === "text" ? (
          <TextTIcon weight="duotone" className="size-4" />
        ) : layer.type === "image" ? (
          <ImageIcon weight="duotone" className="size-4" />
        ) : (
          <HexagonIcon weight="duotone" className="size-4" />
        )}
      </span>
      <AttributeDivider />
      <AttributeLabel
        title="X"
        icon={<ArrowsOutCardinalIcon weight="duotone" className="size-4" />}
      >
        <AttributeInput
          aria-label="X"
          type="number"
          value={Math.round(layer.x)}
          className="w-16"
          onChange={(event) => onChange({ x: Number(event.currentTarget.value) || 0 })}
        />
      </AttributeLabel>
      <AttributeLabel
        title="Y"
        icon={<ArrowsOutCardinalIcon weight="duotone" className="size-4 rotate-90" />}
      >
        <AttributeInput
          aria-label="Y"
          type="number"
          value={Math.round(layer.y)}
          className="w-16"
          onChange={(event) => onChange({ y: Number(event.currentTarget.value) || 0 })}
        />
      </AttributeLabel>
      <AttributeLabel
        title={messages.width}
        icon={<BoundingBoxIcon weight="duotone" className="size-4" />}
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
        icon={<FrameCornersIcon weight="duotone" className="size-4" />}
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
      <AttributeDivider />
      <div className="flex items-center gap-1" title={messages.shapeKind}>
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
  const activeStyle =
    textSelection?.layerId === layer.id && textSelection.start !== textSelection.end
      ? getTextStyleAt(layer, textSelection.start)
      : getTextStyleAt(layer, 0);

  return (
    <>
      <AttributeDivider />
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
      <AttributeLabel
        title={messages.fontWeight}
        icon={<TextBIcon weight="duotone" className="size-4" />}
      >
        <AttributeSelect
          aria-label={messages.fontWeight}
          value={activeStyle.fontWeight}
          className="w-18"
          onChange={(event) => onChange({ fontWeight: event.currentTarget.value })}
        >
          {["300", "400", "500", "600", "700", "800", "900"].map((weight) => (
            <option key={weight} value={weight}>
              {weight}
            </option>
          ))}
        </AttributeSelect>
      </AttributeLabel>
      <AttributeLabel
        title={messages.fontStyle}
        icon={<TextItalicIcon weight="duotone" className="size-4" />}
      >
        <AttributeSelect
          aria-label={messages.fontStyle}
          value={activeStyle.fontStyle}
          className="w-20"
          onChange={(event) => onChange({ fontStyle: event.currentTarget.value })}
        >
          <option value="normal">Normal</option>
          <option value="italic">Italic</option>
        </AttributeSelect>
      </AttributeLabel>
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
        icon={<FrameCornersIcon weight="duotone" className="size-4" />}
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
        icon={<ArrowsOutCardinalIcon weight="duotone" className="size-4" />}
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
