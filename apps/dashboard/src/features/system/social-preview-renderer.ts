import type {
  SocialPreviewComposition,
  SocialPreviewFormat,
  SocialPreviewImageLayer,
  SocialPreviewLayer,
  SocialPreviewShapeLayer,
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
    fontFamily: "Barlow Condensed",
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
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  };
}

export function createShapeLayer(): SocialPreviewShapeLayer {
  return {
    id: createId("shape"),
    type: "shape",
    shape: "rectangle",
    x: 180,
    y: 160,
    width: 280,
    height: 180,
    rotation: 0,
    opacity: 1,
    cornerRadius: 0,
    radius: 90,
    sides: 5,
    points: 5,
    color: "#ffffff",
    border: true,
    borderColor: "#111827",
    borderThickness: 4,
    borderOpacity: 1,
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

interface WrappedTextLine {
  chars: Array<{ char: string; index: number }>;
  width: number;
}

function getTextColorAt(layer: SocialPreviewTextLayer, index: number) {
  const range = layer.colorRanges?.find((entry) => index >= entry.start && index < entry.end);
  return range?.color ?? layer.color;
}

function measureChars(
  ctx: CanvasRenderingContext2D,
  chars: Array<{ char: string; index: number }>,
  letterSpacing: number,
) {
  return (
    chars.reduce((sum, entry) => sum + ctx.measureText(entry.char).width, 0) +
    Math.max(0, chars.length - 1) * letterSpacing
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  letterSpacing: number,
): WrappedTextLine[] {
  const lines: WrappedTextLine[] = [];
  let current: Array<{ char: string; index: number }> = [];

  const pushLine = () => {
    lines.push({ chars: current, width: measureChars(ctx, current, letterSpacing) });
    current = [];
  };

  Array.from(text).forEach((char, index) => {
    if (char === "\n") {
      pushLine();
      return;
    }

    const candidate = [...current, { char, index }];
    if (current.length > 0 && measureChars(ctx, candidate, letterSpacing) > maxWidth) {
      pushLine();
    }
    current.push({ char, index });
  });

  pushLine();
  return lines;
}

async function loadCanvasFont(layer: SocialPreviewTextLayer) {
  if (!("fonts" in document)) return;
  await document.fonts.load(
    `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px "${layer.fontFamily}"`,
  );
}

function drawTextLayer(ctx: CanvasRenderingContext2D, layer: SocialPreviewTextLayer) {
  drawLayerFrame(ctx, layer, () => {
    ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px "${layer.fontFamily}"`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const lines = wrapText(ctx, layer.text, layer.width, layer.letterSpacing);
    const lineHeightPx = layer.fontSize * layer.lineHeight;

    lines.forEach((line, lineIndex) => {
      let cursor =
        layer.align === "center"
          ? (layer.width - line.width) / 2
          : layer.align === "right"
            ? layer.width - line.width
            : 0;
      for (const entry of line.chars) {
        ctx.fillStyle = getTextColorAt(layer, entry.index);
        ctx.fillText(entry.char, cursor, lineIndex * lineHeightPx);
        cursor += ctx.measureText(entry.char).width + layer.letterSpacing;
      }
    });
  });
}

async function drawImageLayer(ctx: CanvasRenderingContext2D, layer: SocialPreviewImageLayer) {
  const image = await loadImage(layer.src);
  drawLayerFrame(ctx, layer, () => {
    drawCoverImage(
      ctx,
      image,
      0,
      0,
      layer.width,
      layer.height,
      layer.zoom ?? 1,
      layer.offsetX ?? 0,
      layer.offsetY ?? 0,
    );
  });
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(r, 0);
  ctx.lineTo(width - r, 0);
  ctx.quadraticCurveTo(width, 0, width, r);
  ctx.lineTo(width, height - r);
  ctx.quadraticCurveTo(width, height, width - r, height);
  ctx.lineTo(r, height);
  ctx.quadraticCurveTo(0, height, 0, height - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
}

function regularPolygonPath(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  points: number,
) {
  for (let index = 0; index < points; index++) {
    const angle = -Math.PI / 2 + (index / points) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function starPath(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  outerRadius: number,
  points: number,
) {
  const innerRadius = outerRadius * 0.45;
  const total = points * 2;
  for (let index = 0; index < total; index++) {
    const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function buildShapePath(ctx: CanvasRenderingContext2D, layer: SocialPreviewShapeLayer) {
  const radius = Math.min(layer.radius, layer.width / 2, layer.height / 2);
  ctx.beginPath();
  switch (layer.shape) {
    case "circle":
      ctx.arc(layer.width / 2, layer.height / 2, radius, 0, Math.PI * 2);
      break;
    case "ellipse":
      ctx.ellipse(
        layer.width / 2,
        layer.height / 2,
        layer.width / 2,
        layer.height / 2,
        0,
        0,
        Math.PI * 2,
      );
      break;
    case "polygon":
      regularPolygonPath(ctx, layer.width / 2, layer.height / 2, radius, layer.sides);
      break;
    case "star":
      starPath(ctx, layer.width / 2, layer.height / 2, radius, layer.points);
      break;
    case "rectangle":
      roundedRectPath(ctx, layer.width, layer.height, layer.cornerRadius);
      break;
  }
  ctx.closePath();
}

function drawShapeLayer(ctx: CanvasRenderingContext2D, layer: SocialPreviewShapeLayer) {
  drawLayerFrame(ctx, layer, () => {
    buildShapePath(ctx, layer);
    ctx.fillStyle = layer.color;
    ctx.fill();
    if (layer.border && layer.borderThickness > 0) {
      ctx.save();
      ctx.globalAlpha = layer.borderOpacity;
      ctx.strokeStyle = layer.borderColor;
      ctx.lineWidth = layer.borderThickness;
      ctx.stroke();
      ctx.restore();
    }
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
      await loadCanvasFont(layer);
      drawTextLayer(ctx, layer);
    } else if (layer.type === "image") {
      await drawImageLayer(ctx, layer);
    } else {
      drawShapeLayer(ctx, layer);
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
