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
    tintColor: "#ffffff",
    tintOpacity: 0,
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

interface ResolvedTextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  color: string;
  lineHeight: number;
  letterSpacing: number;
}

interface WrappedTextChar {
  char: string;
  index: number;
  style: ResolvedTextStyle;
  width: number;
}

interface WrappedTextLine {
  chars: WrappedTextChar[];
  width: number;
  height: number;
}

function getTextStyleAt(layer: SocialPreviewTextLayer, index: number): ResolvedTextStyle {
  const style: ResolvedTextStyle = {
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

function setCanvasTextStyle(ctx: CanvasRenderingContext2D, style: ResolvedTextStyle) {
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px "${style.fontFamily}"`;
}

function measureStyledChar(ctx: CanvasRenderingContext2D, char: string, style: ResolvedTextStyle) {
  setCanvasTextStyle(ctx, style);
  return ctx.measureText(char).width;
}

function wrapText(ctx: CanvasRenderingContext2D, layer: SocialPreviewTextLayer): WrappedTextLine[] {
  const lines: WrappedTextLine[] = [];
  let current: WrappedTextChar[] = [];
  let currentWidth = 0;
  let currentHeight = layer.fontSize * layer.lineHeight;

  const pushLine = () => {
    lines.push({ chars: current, width: currentWidth, height: currentHeight });
    current = [];
    currentWidth = 0;
    currentHeight = layer.fontSize * layer.lineHeight;
  };

  Array.from(layer.text).forEach((char, index) => {
    if (char === "\n") {
      pushLine();
      return;
    }

    const style = getTextStyleAt(layer, index);
    const width = measureStyledChar(ctx, char, style);
    const spacing = current.length > 0 ? style.letterSpacing : 0;
    if (current.length > 0 && currentWidth + spacing + width > layer.width) {
      pushLine();
    }
    current.push({ char, index, style, width });
    currentWidth += (current.length > 1 ? spacing : 0) + width;
    currentHeight = Math.max(currentHeight, style.fontSize * style.lineHeight);
  });

  pushLine();
  return lines;
}

async function loadCanvasFont(layer: SocialPreviewTextLayer) {
  if (!("fonts" in document)) return;
  const styles = new Map<string, ResolvedTextStyle>();
  const addStyle = (style: ResolvedTextStyle) => {
    styles.set(
      `${style.fontStyle}-${style.fontWeight}-${style.fontSize}-${style.fontFamily}`,
      style,
    );
  };

  addStyle(getTextStyleAt(layer, 0));
  for (let index = 0; index < layer.text.length; index++) {
    addStyle(getTextStyleAt(layer, index));
  }

  await Promise.all(
    Array.from(styles.values()).map((style) =>
      document.fonts.load(
        `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px "${style.fontFamily}"`,
      ),
    ),
  );
}

function drawTextLayer(ctx: CanvasRenderingContext2D, layer: SocialPreviewTextLayer) {
  drawLayerFrame(ctx, layer, () => {
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const lines = wrapText(ctx, layer);
    let y = 0;

    for (const line of lines) {
      let cursor =
        layer.align === "center"
          ? (layer.width - line.width) / 2
          : layer.align === "right"
            ? layer.width - line.width
            : 0;
      for (const entry of line.chars) {
        setCanvasTextStyle(ctx, entry.style);
        ctx.fillStyle = entry.style.color;
        ctx.fillText(entry.char, cursor, y);
        cursor += entry.width + entry.style.letterSpacing;
      }
      y += line.height;
    }
  });
}

async function drawImageLayer(ctx: CanvasRenderingContext2D, layer: SocialPreviewImageLayer) {
  const image = await loadImage(layer.src);
  drawLayerFrame(ctx, layer, () => {
    const layerCanvas = document.createElement("canvas");
    layerCanvas.width = Math.max(1, Math.round(layer.width));
    layerCanvas.height = Math.max(1, Math.round(layer.height));
    const layerCtx = layerCanvas.getContext("2d");
    if (!layerCtx) return;

    drawCoverImage(
      layerCtx,
      image,
      0,
      0,
      layer.width,
      layer.height,
      layer.zoom ?? 1,
      layer.offsetX ?? 0,
      layer.offsetY ?? 0,
    );

    if ((layer.tintOpacity ?? 0) > 0) {
      layerCtx.save();
      layerCtx.globalCompositeOperation = "source-atop";
      layerCtx.globalAlpha = layer.tintOpacity ?? 0;
      layerCtx.fillStyle = layer.tintColor ?? "#ffffff";
      layerCtx.fillRect(0, 0, layer.width, layer.height);
      layerCtx.restore();
    }

    ctx.drawImage(layerCanvas, 0, 0, layer.width, layer.height);
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
