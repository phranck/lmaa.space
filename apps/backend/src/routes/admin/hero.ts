import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { ok, respondError } from "../../lib/http.js";
import type { AuthVariables } from "../../middleware/auth.js";
import {
  addHeroImage,
  getAdminHeroImages,
  getHeroRotationEnabled,
  getHeroRotationInterval,
  removeHeroImage,
  setHeroRotationEnabled,
  setHeroRotationInterval,
  toggleHeroImageSelected,
  toggleHeroImageSocialPreview,
  updateHeroImageFocalPoint,
} from "../../services/hero.js";

const rotationSchema = z.object({
  enabled: z.boolean(),
});

const rotationIntervalSchema = z.object({
  interval: z.number().int().min(1).max(99),
});

const addHeroImageSchema = z.object({
  unsplashId: z.string().min(1),
  url: z.string().url(),
  urlSmall: z.string().url(),
  photographer: z.string().min(1),
  photographerUrl: z.string().url(),
  downloadLocation: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  color: z.string().nullable(),
  blurHash: z.string().nullable(),
  description: z.string().nullable(),
  altDescription: z.string().nullable(),
  likes: z.number().int(),
  createdAt: z.string(),
});

const toggleSelectedSchema = z.object({
  selected: z.boolean(),
});

const toggleSocialPreviewSchema = z.object({
  selected: z.boolean(),
});

const focalPointSchema = z.object({
  focalPointY: z.number().int().min(0).max(100),
});

export const heroRoutes = new Hono<{ Variables: AuthVariables }>();

heroRoutes.get("/hero-rotation", async (c) => {
  try {
    const enabled = await getHeroRotationEnabled();
    return ok(c, { enabled });
  } catch (error) {
    return respondError(c, error);
  }
});

heroRoutes.put("/hero-rotation", zValidator("json", rotationSchema), async (c) => {
  const { enabled } = c.req.valid("json");
  try {
    await setHeroRotationEnabled(enabled);
    return ok(c, { enabled });
  } catch (error) {
    return respondError(c, error);
  }
});

heroRoutes.get("/hero-rotation-interval", async (c) => {
  try {
    const interval = await getHeroRotationInterval();
    return ok(c, { interval });
  } catch (error) {
    return respondError(c, error);
  }
});

heroRoutes.put("/hero-rotation-interval", zValidator("json", rotationIntervalSchema), async (c) => {
  const { interval } = c.req.valid("json");
  try {
    await setHeroRotationInterval(interval);
    return ok(c, { interval });
  } catch (error) {
    return respondError(c, error);
  }
});

heroRoutes.get("/hero-images", async (c) => {
  try {
    const images = await getAdminHeroImages();
    return ok(c, images);
  } catch (error) {
    return respondError(c, error);
  }
});

heroRoutes.post("/hero-images", zValidator("json", addHeroImageSchema), async (c) => {
  const data = c.req.valid("json");
  try {
    const image = await addHeroImage(data);
    return ok(c, image);
  } catch (error) {
    return respondError(c, error);
  }
});

heroRoutes.delete("/hero-images/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return respondError(c, new Error("Invalid id"));
  try {
    await removeHeroImage(id);
    return ok(c, { ok: true });
  } catch (error) {
    return respondError(c, error);
  }
});

heroRoutes.patch("/hero-images/:id/select", zValidator("json", toggleSelectedSchema), async (c) => {
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return respondError(c, new Error("Invalid id"));
  const { selected } = c.req.valid("json");
  try {
    const image = await toggleHeroImageSelected(id, selected);
    return ok(c, image);
  } catch (error) {
    return respondError(c, error);
  }
});

heroRoutes.patch(
  "/hero-images/:id/social-preview",
  zValidator("json", toggleSocialPreviewSchema),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (Number.isNaN(id)) return respondError(c, new Error("Invalid id"));
    const { selected } = c.req.valid("json");
    try {
      const image = await toggleHeroImageSocialPreview({ id, selected });
      return ok(c, image);
    } catch (error) {
      return respondError(c, error);
    }
  },
);

heroRoutes.patch(
  "/hero-images/:id/focal-point",
  zValidator("json", focalPointSchema),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (Number.isNaN(id)) return respondError(c, new Error("Invalid id"));
    const { focalPointY } = c.req.valid("json");
    try {
      const image = await updateHeroImageFocalPoint(id, focalPointY);
      return ok(c, image);
    } catch (error) {
      return respondError(c, error);
    }
  },
);
