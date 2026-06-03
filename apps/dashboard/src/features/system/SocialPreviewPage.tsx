import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  ImageIcon,
  PlusIcon,
  SelectionIcon,
  TextTIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import type {
  SocialPreviewComposition,
  SocialPreviewFormat,
  SocialPreviewLayer,
  SocialPreviewTextLayer,
} from "@lmaa/contracts";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { DeleteActionButton, SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import {
  DashboardInput,
  DashboardNumberInput,
  DashboardSelect,
  DashboardTextarea,
} from "@/components/ui/DashboardControls.tsx";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog.tsx";
import { PageFooter } from "@/components/ui/PageFooter.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { UnsplashBrowser } from "@/components/ui/UnsplashBrowser.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useCreateSocialPreviewImage,
  useDeleteSocialPreviewImage,
  useSetActiveSocialPreviewImage,
  useSocialPreviewImages,
  useUploadSocialPreviewAsset,
} from "@/features/system/hooks/useSocialPreviewImages.ts";
import {
  createEmptySocialPreviewComposition,
  createImageLayer,
  createTextLayer,
  formatBytes,
  renderSocialPreviewBlob,
} from "@/features/system/social-preview-renderer.ts";

const FONT_OPTIONS = [
  { value: "Barlow Condensed, Inter, system-ui, sans-serif", label: "Barlow Condensed" },
  { value: "Inter, system-ui, sans-serif", label: "Inter" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Arial, Helvetica, sans-serif", label: "Arial" },
  { value: "Impact, Haettenschweiler, sans-serif", label: "Impact" },
  { value: "ui-monospace, SFMono-Regular, Menlo, monospace", label: "Monospace" },
];

const FORMAT_OPTIONS: Array<{ value: SocialPreviewFormat; label: string }> = [
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/webp", label: "WebP" },
  { value: "image/png", label: "PNG" },
];

interface DragState {
  id: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

interface GuideLine {
  axis: "x" | "y";
  position: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

export function SocialPreviewPage() {
  const { messages, locale } = useI18n();
  const t = messages.system.socialPreview;
  const common = messages.common;

  const { data: savedImages = [], isLoading } = useSocialPreviewImages();
  const uploadPreview = useUploadSocialPreviewAsset();
  const createPreview = useCreateSocialPreviewImage();
  const setActivePreview = useSetActiveSocialPreviewImage();
  const deletePreview = useDeleteSocialPreviewImage();

  const [composition, setComposition] = useState<SocialPreviewComposition>(() =>
    createEmptySocialPreviewComposition(),
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [browserMode, setBrowserMode] = useState<"background" | "layer" | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [format, setFormat] = useState<SocialPreviewFormat>("image/jpeg");
  const [quality, setQuality] = useState(90);
  const [targetSizeKb, setTargetSizeKb] = useState(350);
  const [name, setName] = useState("Social Media Preview");
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [effectiveQuality, setEffectiveQuality] = useState(90);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [stageScale, setStageScale] = useState(1);

  const stageRef = useRef<HTMLDivElement>(null);
  const selectedLayer = useMemo(
    () => composition.layers.find((layer) => layer.id === selectedLayerId) ?? null,
    [composition.layers, selectedLayerId],
  );

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
          setPreviewDataUrl(result.dataUrl);
          setPreviewBlob(result.blob);
          setEffectiveQuality(result.effectiveQuality);
          setRenderError(null);
        })
        .catch((error) => {
          if (cancelled) return;
          setPreviewDataUrl(null);
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
    setComposition((current) => ({
      ...current,
      background: { ...current.background, src: url, zoom: 1, offsetX: 0, offsetY: 0 },
    }));
  }

  function addImageLayer(url: string, alt?: string | null) {
    const layer = createImageLayer(url, alt);
    setComposition((current) => ({ ...current, layers: [...current.layers, layer] }));
    setSelectedLayerId(layer.id);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>, layer: SocialPreviewLayer) {
    const stage = stageRef.current;
    if (!stage) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const position = getPointerPosition(event, stage);
    setSelectedLayerId(layer.id);
    setDragState({
      id: layer.id,
      startX: position.x,
      startY: position.y,
      originX: layer.x,
      originY: layer.y,
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState) return;
    const stage = stageRef.current;
    if (!stage) return;
    const position = getPointerPosition(event, stage);
    const active = composition.layers.find((layer) => layer.id === dragState.id);
    if (!active) return;
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

  function handleStageKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!selectedLayerId) return;
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
    setComposition((current) => {
      const active = current.layers.find((layer) => layer.id === selectedLayerId);
      if (!active) return current;
      return updateLayer(current, selectedLayerId, {
        x: active.x + delta[0],
        y: active.y + delta[1],
      });
    });
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
      activate: true,
    });
  }

  const isSaving = uploadPreview.isPending || createPreview.isPending;

  return (
    <PageLayout>
      <PageHeader title={t.title} />
      <PageBody className="grid min-h-0 grid-cols-[minmax(0,1fr)_22rem] gap-4 p-4">
        <div className="min-w-0 space-y-4 overflow-y-auto pr-1">
          <DashboardSection>
            <DashboardSection.Header
              icon={<SelectionIcon weight="duotone" className="size-4" />}
              title={t.editorTitle}
              addOn={
                <div className="flex gap-2">
                  <DashboardButton
                    type="button"
                    variant="neutral"
                    size="control"
                    leadingIcon={<ImageIcon weight="duotone" className="size-3.5" />}
                    onClick={() => setBrowserMode("background")}
                  >
                    {t.chooseBackground}
                  </DashboardButton>
                  <DashboardButton
                    type="button"
                    variant="neutral"
                    size="control"
                    leadingIcon={<TextTIcon weight="duotone" className="size-3.5" />}
                    onClick={() => {
                      const layer = createTextLayer();
                      setComposition((current) => ({
                        ...current,
                        layers: [...current.layers, layer],
                      }));
                      setSelectedLayerId(layer.id);
                    }}
                  >
                    {t.addText}
                  </DashboardButton>
                  <DashboardButton
                    type="button"
                    variant="neutral"
                    size="control"
                    leadingIcon={<PlusIcon weight="duotone" className="size-3.5" />}
                    onClick={() => setBrowserMode("layer")}
                  >
                    {t.addImage}
                  </DashboardButton>
                </div>
              }
            />
            <DashboardSection.Body>
              <div
                ref={stageRef}
                role="application"
                tabIndex={0}
                className="relative aspect-[1200/630] w-full overflow-hidden rounded-card border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]"
                onPointerMove={handlePointerMove}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
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
                    const selected = layer.id === selectedLayerId;
                    return (
                      <div
                        key={layer.id}
                        className={`absolute cursor-move select-none border ${
                          selected ? "border-[var(--color-primary)]" : "border-transparent"
                        }`}
                        style={renderLayerStyle(layer)}
                        onPointerDown={(event) => handlePointerDown(event, layer)}
                      >
                        {layer.type === "text" ? (
                          <div
                            className="size-full whitespace-pre-wrap break-words"
                            style={{
                              fontFamily: layer.fontFamily,
                              fontSize: layer.fontSize,
                              fontWeight: layer.fontWeight,
                              fontStyle: layer.fontStyle,
                              color: layer.color,
                              textAlign: layer.align,
                              lineHeight: layer.lineHeight,
                              letterSpacing: layer.letterSpacing,
                            }}
                          >
                            {layer.text}
                          </div>
                        ) : (
                          <img
                            src={layer.src}
                            alt={layer.alt ?? ""}
                            className="size-full object-cover"
                            draggable={false}
                          />
                        )}
                      </div>
                    );
                  })}

                  {guides.map((guide, index) =>
                    guide.axis === "x" ? (
                      <div
                        key={`x-${guide.position}-${index}`}
                        className="absolute top-0 h-full w-px bg-sky-400"
                        style={{ left: guide.position }}
                      />
                    ) : (
                      <div
                        key={`y-${guide.position}-${index}`}
                        className="absolute left-0 h-px w-full bg-sky-400"
                        style={{ top: guide.position }}
                      />
                    ),
                  )}
                </div>
              </div>
              <p className="text-xs text-[var(--ds-text-muted)]">{t.keyboardHint}</p>
            </DashboardSection.Body>
          </DashboardSection>

          <DashboardSection>
            <DashboardSection.Header
              icon={<ImageIcon weight="duotone" className="size-4" />}
              title={t.savedTitle}
            />
            <DashboardSection.Body>
              {isLoading ? (
                <p className="text-sm text-[var(--ds-text-muted)]">{common.loading}</p>
              ) : savedImages.length === 0 ? (
                <ContentUnavailableView
                  icon={<ImageIcon weight="duotone" aria-hidden />}
                  title={t.emptyTitle}
                  subtitle={t.emptyHint}
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                  {savedImages.map((image) => (
                    <div
                      key={image.id}
                      className="overflow-hidden rounded-card border border-[var(--ds-border)] bg-[var(--ds-surface)]"
                    >
                      <img
                        src={image.imageUrl}
                        alt=""
                        className="aspect-[1200/630] w-full object-cover"
                      />
                      <div className="space-y-2 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--ds-text)]">
                              {image.name}
                            </p>
                            <p className="text-xs text-[var(--ds-text-muted)]">
                              {new Date(image.createdAt).toLocaleString(locale)} ·{" "}
                              {formatBytes(image.sizeBytes)}
                            </p>
                          </div>
                          {image.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                              <CheckCircleIcon weight="duotone" className="size-3.5" />
                              {t.activeBadge}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <DashboardButton
                            type="button"
                            variant="success"
                            size="control"
                            disabled={image.isActive || setActivePreview.isPending}
                            onClick={() => setActivePreview.mutate({ id: image.id, active: true })}
                          >
                            {t.setActive}
                          </DashboardButton>
                          <a
                            href={image.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-[var(--ds-control-h-control)] items-center gap-1.5 rounded-control border border-[var(--ds-border)] px-3 text-xs font-medium text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
                          >
                            <ArrowSquareOutIcon weight="duotone" className="size-3.5" />
                            {t.openImage}
                          </a>
                          <DeleteActionButton
                            label={t.deleteImage}
                            disabled={deletePreview.isPending}
                            onClick={() => setDeleteTargetId(image.id)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardSection.Body>
          </DashboardSection>
        </div>

        <aside className="min-h-0 overflow-y-auto space-y-4">
          <DashboardSection>
            <DashboardSection.Header
              icon={<ImageIcon weight="duotone" className="size-4" />}
              title={t.outputTitle}
            />
            <DashboardSection.Body>
              <DashboardInput
                label={t.nameLabel}
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
              />
              <DashboardSelect
                label={t.formatLabel}
                value={format}
                onChange={(event) => setFormat(event.currentTarget.value as SocialPreviewFormat)}
                options={FORMAT_OPTIONS}
              />
              <label className="space-y-1 text-sm text-[var(--ds-text)]">
                <span>
                  {t.qualityLabel}: {quality}%
                </span>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={quality}
                  onChange={(event) => setQuality(Number(event.currentTarget.value))}
                  className="w-full accent-[var(--color-primary)]"
                  disabled={format === "image/png"}
                />
              </label>
              <DashboardNumberInput
                label={t.targetSizeLabel}
                hint={format === "image/png" ? t.targetSizePngHint : t.targetSizeHint}
                min={0}
                value={targetSizeKb}
                onChange={(event) => setTargetSizeKb(Number(event.currentTarget.value) || 0)}
              />
              <div className="overflow-hidden rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)]">
                {previewDataUrl ? (
                  <img
                    src={previewDataUrl}
                    alt=""
                    className="aspect-[1200/630] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[1200/630] items-center justify-center text-sm text-[var(--ds-text-muted)]">
                    {common.loading}
                  </div>
                )}
              </div>
              {renderError ? <p className="text-sm text-red-500">{renderError}</p> : null}
              {previewBlob ? (
                <p className="text-xs text-[var(--ds-text-muted)]">
                  {t.previewMeta
                    .replace("{size}", formatBytes(previewBlob.size))
                    .replace("{quality}", String(effectiveQuality))}
                </p>
              ) : null}
            </DashboardSection.Body>
          </DashboardSection>

          <DashboardSection>
            <DashboardSection.Header
              icon={<SelectionIcon weight="duotone" className="size-4" />}
              title={t.selectionTitle}
            />
            <DashboardSection.Body>
              <DashboardInput
                label={t.backgroundColor}
                type="color"
                value={composition.background.color}
                onChange={(event) =>
                  setComposition((current) => ({
                    ...current,
                    background: { ...current.background, color: event.currentTarget.value },
                  }))
                }
              />
              <DashboardNumberInput
                label={t.backgroundZoom}
                min={0.1}
                max={10}
                step={0.05}
                value={composition.background.zoom}
                onChange={(event) =>
                  setComposition((current) => ({
                    ...current,
                    background: {
                      ...current.background,
                      zoom: Number(event.currentTarget.value) || 1,
                    },
                  }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <DashboardNumberInput
                  label={t.backgroundOffsetX}
                  value={composition.background.offsetX}
                  onChange={(event) =>
                    setComposition((current) => ({
                      ...current,
                      background: {
                        ...current.background,
                        offsetX: Number(event.currentTarget.value) || 0,
                      },
                    }))
                  }
                />
                <DashboardNumberInput
                  label={t.backgroundOffsetY}
                  value={composition.background.offsetY}
                  onChange={(event) =>
                    setComposition((current) => ({
                      ...current,
                      background: {
                        ...current.background,
                        offsetY: Number(event.currentTarget.value) || 0,
                      },
                    }))
                  }
                />
              </div>

              {selectedLayer ? (
                <LayerControls
                  layer={selectedLayer}
                  messages={t}
                  onChange={(patch) =>
                    setComposition((current) => updateLayer(current, selectedLayer.id, patch))
                  }
                  onDelete={() => {
                    setComposition((current) => removeLayer(current, selectedLayer.id));
                    setSelectedLayerId(null);
                  }}
                />
              ) : (
                <p className="rounded-control border border-[var(--ds-border-subtle)] bg-[var(--ds-bg-elevated)] px-3 py-2 text-sm text-[var(--ds-text-muted)]">
                  {t.noSelection}
                </p>
              )}
            </DashboardSection.Body>
          </DashboardSection>
        </aside>
      </PageBody>

      <PageFooter>
        <SaveActionButton
          label={isSaving ? common.saving : t.saveAndActivate}
          disabled={isSaving || !previewBlob || !!renderError || !name.trim()}
          busy={isSaving}
          onClick={() => void handleSave()}
        />
      </PageFooter>

      {browserMode ? (
        <UnsplashBrowser
          defaultQuery={browserMode === "background" ? "shopping" : "logo"}
          onSelect={(photo) => {
            if (browserMode === "background") {
              selectUnsplashAsBackground(photo.url);
            } else {
              addImageLayer(photo.url, photo.altDescription);
            }
            setBrowserMode(null);
          }}
          onClose={() => setBrowserMode(null)}
        />
      ) : null}

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

function LayerControls({
  layer,
  messages,
  onChange,
  onDelete,
}: {
  layer: SocialPreviewLayer;
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  onChange: (patch: Partial<SocialPreviewLayer>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-3 rounded-control border border-[var(--ds-border-subtle)] bg-[var(--ds-bg-elevated)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--ds-text)]">
          {layer.type === "text" ? messages.textLayer : messages.imageLayer}
        </p>
        <DashboardButton
          type="button"
          variant="danger"
          size="control"
          leadingIcon={<TrashIcon weight="duotone" className="size-3.5" />}
          onClick={onDelete}
        >
          {messages.deleteLayer}
        </DashboardButton>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <DashboardNumberInput
          label="X"
          value={Math.round(layer.x)}
          onChange={(event) => onChange({ x: Number(event.currentTarget.value) || 0 })}
        />
        <DashboardNumberInput
          label="Y"
          value={Math.round(layer.y)}
          onChange={(event) => onChange({ y: Number(event.currentTarget.value) || 0 })}
        />
        <DashboardNumberInput
          label={messages.width}
          min={1}
          value={Math.round(layer.width)}
          onChange={(event) =>
            onChange({ width: Math.max(1, Number(event.currentTarget.value) || 1) })
          }
        />
        <DashboardNumberInput
          label={messages.height}
          min={1}
          value={Math.round(layer.height)}
          onChange={(event) =>
            onChange({ height: Math.max(1, Number(event.currentTarget.value) || 1) })
          }
        />
        <DashboardNumberInput
          label={messages.rotation}
          value={Math.round(layer.rotation)}
          onChange={(event) => onChange({ rotation: Number(event.currentTarget.value) || 0 })}
        />
        <DashboardNumberInput
          label={messages.opacity}
          min={0}
          max={100}
          value={Math.round(layer.opacity * 100)}
          onChange={(event) =>
            onChange({ opacity: clamp((Number(event.currentTarget.value) || 0) / 100, 0, 1) })
          }
        />
      </div>

      {layer.type === "text" ? (
        <TextLayerControls layer={layer} messages={messages} onChange={onChange} />
      ) : null}
    </div>
  );
}

function TextLayerControls({
  layer,
  messages,
  onChange,
}: {
  layer: SocialPreviewTextLayer;
  messages: ReturnType<typeof useI18n>["messages"]["system"]["socialPreview"];
  onChange: (patch: Partial<SocialPreviewLayer>) => void;
}) {
  return (
    <>
      <DashboardTextarea
        label={messages.textContent}
        rows={3}
        value={layer.text}
        onChange={(event) => onChange({ text: event.currentTarget.value })}
      />
      <DashboardSelect
        label={messages.fontFamily}
        value={layer.fontFamily}
        onChange={(event) => onChange({ fontFamily: event.currentTarget.value })}
        options={FONT_OPTIONS}
      />
      <div className="grid grid-cols-2 gap-2">
        <DashboardInput
          label={messages.textColor}
          type="color"
          value={layer.color}
          onChange={(event) => onChange({ color: event.currentTarget.value })}
        />
        <DashboardNumberInput
          label={messages.fontSize}
          min={1}
          value={layer.fontSize}
          onChange={(event) =>
            onChange({ fontSize: Math.max(1, Number(event.currentTarget.value) || 1) })
          }
        />
        <DashboardSelect
          label={messages.fontWeight}
          value={layer.fontWeight}
          onChange={(event) => onChange({ fontWeight: event.currentTarget.value })}
          options={[
            { value: "400", label: "400" },
            { value: "500", label: "500" },
            { value: "600", label: "600" },
            { value: "700", label: "700" },
            { value: "900", label: "900" },
          ]}
        />
        <DashboardSelect
          label={messages.fontStyle}
          value={layer.fontStyle}
          onChange={(event) => onChange({ fontStyle: event.currentTarget.value })}
          options={[
            { value: "normal", label: "Normal" },
            { value: "italic", label: "Italic" },
          ]}
        />
        <DashboardSelect
          label={messages.align}
          value={layer.align}
          onChange={(event) =>
            onChange({ align: event.currentTarget.value as SocialPreviewTextLayer["align"] })
          }
          options={[
            { value: "left", label: messages.alignLeft },
            { value: "center", label: messages.alignCenter },
            { value: "right", label: messages.alignRight },
          ]}
        />
        <DashboardNumberInput
          label={messages.lineHeight}
          min={0.5}
          max={4}
          step={0.05}
          value={layer.lineHeight}
          onChange={(event) => onChange({ lineHeight: Number(event.currentTarget.value) || 1 })}
        />
        <DashboardNumberInput
          label={messages.letterSpacing}
          value={layer.letterSpacing}
          onChange={(event) => onChange({ letterSpacing: Number(event.currentTarget.value) || 0 })}
        />
      </div>
    </>
  );
}
