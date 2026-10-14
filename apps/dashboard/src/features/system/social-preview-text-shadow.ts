import type { SocialPreviewTextLayer } from "@lmaa/contracts";

/**
 * A text layer's shadow with every value present, as the stage and the
 * renderer draw it.
 *
 * @property color - The shadow's color as `#rrggbb`.
 * @property opacity - From 0 to 1, applied to the color.
 * @property blur - The blur radius in canvas pixels. CSS `text-shadow` and the
 *   canvas `shadowBlur` both blur with a standard deviation of half this
 *   value, so the stage and the rendered image soften the shadow alike.
 * @property offsetX - Distance from the text along the layer's own x axis, in
 *   canvas pixels.
 * @property offsetY - Distance from the text along the layer's own y axis, in
 *   canvas pixels.
 */
export interface TextShadow {
  color: string;
  opacity: number;
  blur: number;
  offsetX: number;
  offsetY: number;
}

/** The shadow a text layer shows when it is switched on and has no values of its own. */
export const DEFAULT_TEXT_SHADOW: TextShadow = {
  color: "#000000",
  opacity: 0.5,
  blur: 8,
  offsetX: 4,
  offsetY: 4,
};

/**
 * The shadow settings of a text layer, whether or not the shadow is on.
 *
 * A layer stores only the values somebody set, so the controls show the
 * defaults for the rest and switching the shadow on draws what they show.
 *
 * @param layer - The text layer.
 * @returns The layer's values, with {@link DEFAULT_TEXT_SHADOW} for any it
 *   lacks.
 */
export function getTextShadowSettings(layer: SocialPreviewTextLayer): TextShadow {
  return {
    color: layer.shadowColor ?? DEFAULT_TEXT_SHADOW.color,
    opacity: layer.shadowOpacity ?? DEFAULT_TEXT_SHADOW.opacity,
    blur: layer.shadowBlur ?? DEFAULT_TEXT_SHADOW.blur,
    offsetX: layer.shadowOffsetX ?? DEFAULT_TEXT_SHADOW.offsetX,
    offsetY: layer.shadowOffsetY ?? DEFAULT_TEXT_SHADOW.offsetY,
  };
}

/**
 * The shadow to draw for a text layer.
 *
 * @param layer - The text layer.
 * @returns Its shadow, or `null` while the shadow is switched off.
 */
export function resolveTextShadow(layer: SocialPreviewTextLayer): TextShadow | null {
  return layer.shadow ? getTextShadowSettings(layer) : null;
}

/**
 * The shadow's color with its opacity, in a form CSS and the canvas both read.
 *
 * @param shadow - The shadow.
 * @returns The color as `#rrggbbaa`.
 */
export function textShadowColor(shadow: TextShadow): string {
  const alpha = Math.round(Math.min(1, Math.max(0, shadow.opacity)) * 255);
  return `${shadow.color}${alpha.toString(16).padStart(2, "0")}`;
}

/**
 * The CSS `text-shadow` value that shows the shadow on the stage.
 *
 * @param shadow - The shadow.
 * @returns Offset, blur and color, in canvas pixels, which the stage's scale
 *   transform shrinks together with the text.
 */
export function cssTextShadow(shadow: TextShadow): string {
  return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${textShadowColor(shadow)}`;
}

/**
 * The canvas shadow offset that matches the stage for a rotated layer.
 *
 * The canvas applies `shadowOffsetX` and `shadowOffsetY` in its own unrotated
 * space, whatever transform is set, while CSS turns a text shadow together with
 * its element. Turning the offset by the layer's angle puts the shadow where
 * the stage shows it.
 *
 * @param shadow - The shadow.
 * @param rotationDegrees - The layer's rotation, clockwise, in degrees.
 * @returns The offset in canvas pixels.
 */
export function canvasShadowOffset(
  shadow: TextShadow,
  rotationDegrees: number,
): { x: number; y: number } {
  const angle = (rotationDegrees * Math.PI) / 180;
  return {
    x: shadow.offsetX * Math.cos(angle) - shadow.offsetY * Math.sin(angle),
    y: shadow.offsetX * Math.sin(angle) + shadow.offsetY * Math.cos(angle),
  };
}
