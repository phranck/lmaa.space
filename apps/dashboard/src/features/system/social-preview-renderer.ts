import type {
  SocialPreviewComposition,
  SocialPreviewFormat,
  SocialPreviewImageLayer,
  SocialPreviewLayer,
  SocialPreviewShapeLayer,
  SocialPreviewTextLayer,
} from "@lmaa/contracts";

import {
  applyBrightnessContrast,
  applyGaussianBlur,
} from "@/features/system/social-preview-pixel-filters.ts";
import {
  canvasShadowOffset,
  resolveTextShadow,
  textShadowColor,
} from "@/features/system/social-preview-text-shadow.ts";

const SOCIAL_PREVIEW_WIDTH = 1200;
const SOCIAL_PREVIEW_HEIGHT = 630;

export function createEmptySocialPreviewComposition(): SocialPreviewComposition {
  return {
    version: 1,
    width: SOCIAL_PREVIEW_WIDTH,
    height: SOCIAL_PREVIEW_HEIGHT,
    background: {
      src: null,
      name: "Base Image",
      color: "#111827",
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    },
    layers: [],
  };
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createTextLayer(): SocialPreviewTextLayer {
  return {
    id: createId("text"),
    type: "text",
    name: "Text",
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
    textDecoration: "none",
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
    name: alt?.trim() || "Image",
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
    brightness: 1,
    contrast: 1,
  };
}

export function createShapeLayer(): SocialPreviewShapeLayer {
  return {
    id: createId("shape"),
    type: "shape",
    name: "Rectangle",
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
  textDecoration: "none" | "underline";
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

/** Draws a text layer's lines into a context whose transform already places the layer. */
function drawTextLines(ctx: CanvasRenderingContext2D, layer: SocialPreviewTextLayer) {
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
      if (entry.style.textDecoration === "underline") {
        const underlineY = y + entry.style.fontSize * 0.92;
        ctx.save();
        ctx.strokeStyle = entry.style.color;
        ctx.lineWidth = Math.max(1, entry.style.fontSize / 16);
        ctx.beginPath();
        ctx.moveTo(cursor, underlineY);
        ctx.lineTo(cursor + entry.width, underlineY);
        ctx.stroke();
        ctx.restore();
      }
      cursor += entry.width + entry.style.letterSpacing;
    }
    y += line.height;
  }
}

/** A blank canvas the size of the one being drawn on, for drawing a layer apart. */
function createMatchingCanvas(ctx: CanvasRenderingContext2D) {
  const canvas = document.createElement("canvas");
  canvas.width = ctx.canvas.width;
  canvas.height = ctx.canvas.height;
  return canvas.getContext("2d");
}

function drawTextLayer(ctx: CanvasRenderingContext2D, layer: SocialPreviewTextLayer) {
  const shadow = resolveTextShadow(layer);
  const glyphCtx = shadow ? createMatchingCanvas(ctx) : null;
  const groupCtx = shadow ? createMatchingCanvas(ctx) : null;
  if (!shadow || !glyphCtx || !groupCtx) {
    drawLayerFrame(ctx, layer, () => drawTextLines(ctx, layer));
    return;
  }

  // CSS paints a text shadow behind every letter and then applies the layer's
  // opacity to text and shadow together. Drawing each letter with a shadow of
  // its own would lay that shadow over the letter before it, so the text is
  // drawn once without one, given its shadow as a whole, and only then faded.
  drawLayerFrame(glyphCtx, { ...layer, opacity: 1 }, () => drawTextLines(glyphCtx, layer));
  const offset = canvasShadowOffset(shadow, layer.rotation);
  groupCtx.shadowColor = textShadowColor(shadow);
  groupCtx.shadowBlur = shadow.blur;
  groupCtx.shadowOffsetX = offset.x;
  groupCtx.shadowOffsetY = offset.y;
  groupCtx.drawImage(glyphCtx.canvas, 0, 0);

  ctx.save();
  ctx.globalAlpha = layer.opacity;
  ctx.drawImage(groupCtx.canvas, 0, 0);
  ctx.restore();
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
    const brightness = layer.brightness ?? 1;
    const contrast = layer.contrast ?? 1;
    if (brightness !== 1 || contrast !== 1) {
      const pixels = layerCtx.getImageData(0, 0, layerCanvas.width, layerCanvas.height);
      applyBrightnessContrast(pixels.data, brightness, contrast);
      layerCtx.putImageData(pixels, 0, 0);
    }

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
  inset: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  const left = inset;
  const top = inset;
  const right = inset + width;
  const bottom = inset + height;
  ctx.moveTo(left + r, top);
  ctx.lineTo(right - r, top);
  ctx.quadraticCurveTo(right, top, right, top + r);
  ctx.lineTo(right, bottom - r);
  ctx.quadraticCurveTo(right, bottom, right - r, bottom);
  ctx.lineTo(left + r, bottom);
  ctx.quadraticCurveTo(left, bottom, left, bottom - r);
  ctx.lineTo(left, top + r);
  ctx.quadraticCurveTo(left, top, left + r, top);
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
  // `ShapeLayerContent` on the stage draws rectangles, circles and ellipses
  // half a border width inside the layer, so their border lies within the
  // layer's bounds. Polygons and stars keep the border centered on their
  // outline there, and so they do here.
  const inset = layer.border ? layer.borderThickness / 2 : 0;
  ctx.beginPath();
  switch (layer.shape) {
    case "circle":
      ctx.arc(layer.width / 2, layer.height / 2, Math.max(0, radius - inset), 0, Math.PI * 2);
      break;
    case "ellipse":
      ctx.ellipse(
        layer.width / 2,
        layer.height / 2,
        Math.max(0, layer.width / 2 - inset),
        Math.max(0, layer.height / 2 - inset),
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
      roundedRectPath(
        ctx,
        inset,
        Math.max(0, layer.width - inset * 2),
        Math.max(0, layer.height - inset * 2),
        layer.cornerRadius,
      );
      break;
  }
  ctx.closePath();
}

/** Fills a shape and strokes its border, in a context whose transform already places the layer. */
function drawShape(ctx: CanvasRenderingContext2D, layer: SocialPreviewShapeLayer) {
  buildShapePath(ctx, layer);
  ctx.fillStyle = layer.color;
  ctx.fill();
  if (layer.border && layer.borderThickness > 0) {
    ctx.save();
    // The layer's own opacity is already set, and the border fades with it.
    ctx.globalAlpha *= layer.borderOpacity;
    ctx.strokeStyle = layer.borderColor;
    ctx.lineWidth = layer.borderThickness;
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * The part of the canvas a blurred layer can reach: its turned bounds, widened
 * by its border and by three standard deviations of blur, which is where a
 * Gaussian has faded to nothing.
 *
 * @returns Whole pixels within the canvas, or `null` where the layer lies
 *   entirely outside it.
 */
function getBlurRegion(
  layer: SocialPreviewShapeLayer,
  blur: number,
  canvasWidth: number,
  canvasHeight: number,
) {
  const angle = (layer.rotation * Math.PI) / 180;
  const halfWidth =
    (Math.abs(Math.cos(angle)) * layer.width + Math.abs(Math.sin(angle)) * layer.height) / 2;
  const halfHeight =
    (Math.abs(Math.sin(angle)) * layer.width + Math.abs(Math.cos(angle)) * layer.height) / 2;
  const margin = Math.ceil(blur * 3 + (layer.border ? layer.borderThickness : 0)) + 1;
  const centerX = layer.x + layer.width / 2;
  const centerY = layer.y + layer.height / 2;
  const left = Math.max(0, Math.floor(centerX - halfWidth - margin));
  const top = Math.max(0, Math.floor(centerY - halfHeight - margin));
  const right = Math.min(canvasWidth, Math.ceil(centerX + halfWidth + margin));
  const bottom = Math.min(canvasHeight, Math.ceil(centerY + halfHeight + margin));
  if (right <= left || bottom <= top) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function drawShapeLayer(ctx: CanvasRenderingContext2D, layer: SocialPreviewShapeLayer) {
  const blur = layer.blur ?? 0;
  const shapeCtx = blur > 0 ? createMatchingCanvas(ctx) : null;
  if (!shapeCtx) {
    drawLayerFrame(ctx, layer, () => drawShape(ctx, layer));
    return;
  }

  // CSS blurs the shape with its border and then fades the result by the
  // layer's opacity, so the shape is drawn apart at full opacity, blurred
  // there, and faded only as it is laid onto the image. Only the region the
  // blur can reach is read back, because a whole large canvas would take
  // seconds.
  drawLayerFrame(shapeCtx, { ...layer, opacity: 1 }, () => drawShape(shapeCtx, layer));
  const region = getBlurRegion(layer, blur, shapeCtx.canvas.width, shapeCtx.canvas.height);
  if (!region) return;
  const pixels = shapeCtx.getImageData(region.x, region.y, region.width, region.height);
  applyGaussianBlur(pixels.data, region.width, region.height, blur);
  shapeCtx.putImageData(pixels, region.x, region.y);

  ctx.save();
  ctx.globalAlpha = layer.opacity;
  ctx.drawImage(shapeCtx.canvas, 0, 0);
  ctx.restore();
}

async function renderSocialPreviewToCanvas(composition: SocialPreviewComposition) {
  const canvas = document.createElement("canvas");
  canvas.width = composition.width;
  canvas.height = composition.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  ctx.fillStyle = composition.background.color;
  ctx.fillRect(0, 0, composition.width, composition.height);

  for (const layer of composition.layers) {
    if (layer.hidden) continue;
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
