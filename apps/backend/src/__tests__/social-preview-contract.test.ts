import { describe, expect, it } from "vitest";

import {
  SOCIAL_PREVIEW_MAX_SHADOW_BLUR_PX,
  SOCIAL_PREVIEW_MAX_SHADOW_OFFSET_PX,
  socialPreviewTextLayerSchema,
} from "@lmaa/contracts";

const textLayer = {
  id: "text-1",
  type: "text",
  x: 120,
  y: 120,
  width: 520,
  height: 120,
  rotation: 0,
  opacity: 1,
  text: "lmaa.space",
  fontFamily: "Barlow Condensed",
  fontSize: 72,
  fontWeight: "700",
  fontStyle: "normal",
  color: "#ffffff",
  align: "left",
  lineHeight: 1.05,
  letterSpacing: 0,
};

const shadow = {
  shadow: true,
  shadowColor: "#112233",
  shadowOpacity: 0.5,
  shadowBlur: 8,
  shadowOffsetX: -4,
  shadowOffsetY: 4,
};

describe("socialPreviewTextLayerSchema shadow", () => {
  it("accepts a layer stored before shadows existed", () => {
    expect(socialPreviewTextLayerSchema.safeParse(textLayer).success).toBe(true);
  });

  it("accepts a shadow within its bounds", () => {
    expect(socialPreviewTextLayerSchema.safeParse({ ...textLayer, ...shadow }).success).toBe(true);
    expect(
      socialPreviewTextLayerSchema.safeParse({
        ...textLayer,
        ...shadow,
        shadowBlur: SOCIAL_PREVIEW_MAX_SHADOW_BLUR_PX,
        shadowOffsetX: -SOCIAL_PREVIEW_MAX_SHADOW_OFFSET_PX,
        shadowOffsetY: SOCIAL_PREVIEW_MAX_SHADOW_OFFSET_PX,
      }).success,
    ).toBe(true);
  });

  it("refuses a blur or an offset beyond its bounds", () => {
    for (const outOfBounds of [
      { shadowBlur: SOCIAL_PREVIEW_MAX_SHADOW_BLUR_PX + 1 },
      { shadowBlur: -1 },
      { shadowOffsetX: SOCIAL_PREVIEW_MAX_SHADOW_OFFSET_PX + 1 },
      { shadowOffsetY: -SOCIAL_PREVIEW_MAX_SHADOW_OFFSET_PX - 1 },
      { shadowOpacity: 1.5 },
    ]) {
      expect(
        socialPreviewTextLayerSchema.safeParse({ ...textLayer, ...shadow, ...outOfBounds }).success,
      ).toBe(false);
    }
  });

  it("takes the shadow color only as #rrggbb, because the stage writes it into CSS", () => {
    for (const shadowColor of ["#123", "red", "#11223344", "#112233; background: url(x)"]) {
      expect(
        socialPreviewTextLayerSchema.safeParse({ ...textLayer, ...shadow, shadowColor }).success,
      ).toBe(false);
    }
  });
});
