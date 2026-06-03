import type {
  SocialPreviewComposition,
  SocialPreviewFormat,
  SocialPreviewImageLayer,
  SocialPreviewLayer,
  SocialPreviewTextLayer,
} from "@lmaa/contracts";

export const SOCIAL_PREVIEW_WIDTH = 1200;
export const SOCIAL_PREVIEW_HEIGHT = 630;

export function createEmptySocialPreviewComposition(): SocialPreviewComposition {
  return {
    version: 1,
    width: SOCIAL_PREVIEW_WIDTH,
    height: SOCIAL_PREVIEW_HEIGHT,
    background: {
      src: null,
      color: "#111827",
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    },
    layers: [],
  };
}

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createTextLayer(): SocialPreviewTextLayer {
  return {
    id: createId("text"),
    type: "text",
    text: "lmaa.space",
    x: 120,
    y: 120,
    width: 520,
    height: 120,
    rotation: 0,
    opacity: 1,
    fontFamily: "Barlow Condensed, Inter, system-ui, sans-serif",
    fontSize: 72,
    fontWeight: "700",
    fontStyle: "normal",
    color: "#ffffff",
    align: "left",
    lineHeight: 1.05,
    letterSpacing: 0,
  };
}

export function createImageLayer(src: string, alt?: string | null): SocialPreviewImageLayer {
  return {
    id: createId("image"),
    type: "image",
    src,
    alt: alt ?? null,
    x: 720,
    y: 120,
    width: 300,
    height: 220,
    rotation: 0,
    opacity: 1,
  };
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image could not be loaded: ${src}`));
    img.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  zoom = 1,
  offsetX = 0,
  offsetY = 0,
) {
  const baseScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const scale = baseScale * zoom;
  const drawnWidth = image.naturalWidth * scale;
  const drawnHeight = image.naturalHeight * scale;
  const drawX = x + (width - drawnWidth) / 2 + offsetX;
  const drawY = y + (height - drawnHeight) / 2 + offsetY;
  ctx.drawImage(image, drawX, drawY, drawnWidth, drawnHeight);
}

function drawLayerFrame(
  ctx: CanvasRenderingContext2D,
  layer: SocialPreviewLayer,
  draw: () => void,
) {
  ctx.save();
  ctx.globalAlpha = layer.opacity;
  ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.translate(-layer.width / 2, -layer.height / 2);
  draw();
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split("\n")) {
    const words = rawLine.split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawTextLayer(ctx: CanvasRenderingContext2D, layer: SocialPreviewTextLayer) {
  drawLayerFrame(ctx, layer, () => {
    ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
    ctx.fillStyle = layer.color;
    ctx.textBaseline = "top";
    ctx.textAlign = layer.align;
    const lines = wrapText(ctx, layer.text, layer.width);
    const lineHeightPx = layer.fontSize * layer.lineHeight;
    const x =
      layer.align === "center" ? layer.width / 2 : layer.align === "right" ? layer.width : 0;

    lines.forEach((line, index) => {
      if (layer.letterSpacing === 0) {
        ctx.fillText(line, x, index * lineHeightPx, layer.width);
        return;
      }

      let cursor = x;
      const chars = Array.from(line);
      const totalWidth =
        chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) +
        Math.max(0, chars.length - 1) * layer.letterSpacing;
      if (layer.align === "center") cursor -= totalWidth / 2;
      if (layer.align === "right") cursor -= totalWidth;
      for (const char of chars) {
        ctx.fillText(char, cursor, index * lineHeightPx);
        cursor += ctx.measureText(char).width + layer.letterSpacing;
      }
    });
  });
}

async function drawImageLayer(ctx: CanvasRenderingContext2D, layer: SocialPreviewImageLayer) {
  const image = await loadImage(layer.src);
  drawLayerFrame(ctx, layer, () => {
    drawCoverImage(ctx, image, 0, 0, layer.width, layer.height);
  });
}

export async function renderSocialPreviewToCanvas(composition: SocialPreviewComposition) {
  const canvas = document.createElement("canvas");
  canvas.width = composition.width;
  canvas.height = composition.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  ctx.fillStyle = composition.background.color;
  ctx.fillRect(0, 0, composition.width, composition.height);

  if (composition.background.src) {
    const background = await loadImage(composition.background.src);
    drawCoverImage(
      ctx,
      background,
      0,
      0,
      composition.width,
      composition.height,
      composition.background.zoom,
      composition.background.offsetX,
      composition.background.offsetY,
    );
  }

  for (const layer of composition.layers) {
    if (layer.type === "text") {
      drawTextLayer(ctx, layer);
    } else {
      await drawImageLayer(ctx, layer);
    }
  }

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, format: SocialPreviewFormat, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The composition could not be rendered."));
      },
      format,
      format === "image/png" ? undefined : quality,
    );
  });
}

export async function renderSocialPreviewBlob(
  composition: SocialPreviewComposition,
  format: SocialPreviewFormat,
  qualityPercent: number,
  targetMaxBytes?: number | null,
): Promise<{ blob: Blob; dataUrl: string; effectiveQuality: number }> {
  const canvas = await renderSocialPreviewToCanvas(composition);
  const requestedQuality = Math.max(0.01, Math.min(1, qualityPercent / 100));

  let effectiveQuality = requestedQuality;
  let blob = await canvasToBlob(canvas, format, requestedQuality);

  if (
    targetMaxBytes &&
    targetMaxBytes > 0 &&
    format !== "image/png" &&
    blob.size > targetMaxBytes
  ) {
    let low = 0.05;
    let high = requestedQuality;
    let smallestCandidate = blob;
    for (let i = 0; i < 7; i++) {
      const mid = (low + high) / 2;
      const candidate = await canvasToBlob(canvas, format, mid);
      if (candidate.size < smallestCandidate.size) {
        smallestCandidate = candidate;
      }
      if (candidate.size > targetMaxBytes) {
        high = mid;
      } else {
        low = mid;
        blob = candidate;
      }
    }
    if (blob.size > targetMaxBytes) {
      blob = smallestCandidate;
      effectiveQuality = high;
    } else {
      effectiveQuality = low;
    }
  }

  return {
    blob,
    dataUrl: canvas.toDataURL(format, format === "image/png" ? undefined : effectiveQuality),
    effectiveQuality: Math.round(effectiveQuality * 100),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
