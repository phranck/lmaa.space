import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "test", LOG_LEVEL: "silent" },
}));

vi.mock("../middleware/auth.js", () => ({
  requireAdmin: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
  requireOwner: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

const serviceMocks = vi.hoisted(() => ({
  createManagedEmailTemplate: vi.fn(),
  updateManagedEmailTemplate: vi.fn(),
  getManagedEmailTemplates: vi.fn(),
  getManagedEmailTemplateById: vi.fn(),
  deleteManagedEmailTemplate: vi.fn(),
  importManagedEmailTemplate: vi.fn(),
}));

vi.mock("../services/email-templates.js", () => serviceMocks);

const emailMocks = vi.hoisted(() => ({ sendMail: vi.fn() }));
const templateRepoMocks = vi.hoisted(() => ({ getEmailTemplateById: vi.fn() }));
const adminAuthMocks = vi.hoisted(() => ({ getAdminProfileById: vi.fn() }));

vi.mock("../services/email.js", () => emailMocks);
vi.mock("../repositories/email-templates.js", () => templateRepoMocks);
vi.mock("../repositories/admin-auth.js", () => adminAuthMocks);

import { emailTemplateRoutes } from "../routes/admin/email-templates.js";

const sampleTemplate = {
  id: 6,
  name: "shop-submission-feedback",
  subject: 'Vorschlag "{{shopName}}"',
  headerBannerUrl: null,
  headerText: null,
  bodyText: "Hallo, dein Vorschlag {{shopName}} ist da.",
  footerBannerUrl: null,
  footerText: null,
  isSystemTemplate: true,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

/**
 * Build a Hono test app that injects `isOwner` on every request before
 * hitting the routes under test.
 */
function makeApp(isOwner: boolean) {
  const app = new Hono<{ Variables: { isOwner: boolean; adminId: number; role: string } }>();
  app.use("*", async (c, next) => {
    c.set("isOwner", isOwner);
    c.set("adminId", 1);
    c.set("role", isOwner ? "owner" : "admin");
    await next();
  });
  app.route("/", emailTemplateRoutes);
  return app;
}

describe("email-templates routes — owner gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /email-templates", () => {
    it("allows owner to set isSystemTemplate=true", async () => {
      const template = {
        id: 1,
        name: "sys",
        subject: "System subject",
        headerBannerUrl: null,
        headerText: null,
        bodyText: "hello",
        footerBannerUrl: null,
        footerText: null,
        isSystemTemplate: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serviceMocks.createManagedEmailTemplate.mockResolvedValue({ ok: true, data: template });

      const app = makeApp(true);
      const res = await app.request("/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "sys",
          subject: "System subject",
          bodyText: "hello",
          isSystemTemplate: true,
        }),
      });

      expect(res.status).toBe(201);
      expect(serviceMocks.createManagedEmailTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ isSystemTemplate: true }),
      );
    });

    it("silently strips isSystemTemplate for non-owner on create", async () => {
      const template = {
        id: 2,
        name: "regular",
        subject: "Regular subject",
        headerBannerUrl: null,
        headerText: null,
        bodyText: "world",
        footerBannerUrl: null,
        footerText: null,
        isSystemTemplate: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serviceMocks.createManagedEmailTemplate.mockResolvedValue({ ok: true, data: template });

      const app = makeApp(false);
      const res = await app.request("/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "regular",
          subject: "Regular subject",
          bodyText: "world",
          isSystemTemplate: true,
        }),
      });

      expect(res.status).toBe(201);
      // isSystemTemplate must have been stripped (undefined) in the payload sent to service
      const callArg = serviceMocks.createManagedEmailTemplate.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(callArg.isSystemTemplate).toBeUndefined();
    });
  });

  describe("PUT /email-templates/:id", () => {
    it("allows owner to set isSystemTemplate=true on update", async () => {
      const template = {
        id: 5,
        name: "sys",
        subject: "System subject",
        headerBannerUrl: null,
        headerText: null,
        bodyText: "body",
        footerBannerUrl: null,
        footerText: null,
        isSystemTemplate: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serviceMocks.updateManagedEmailTemplate.mockResolvedValue({ ok: true, data: template });

      const app = makeApp(true);
      const res = await app.request("/email-templates/5", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSystemTemplate: true }),
      });

      expect(res.status).toBe(200);
      expect(serviceMocks.updateManagedEmailTemplate).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ isSystemTemplate: true }),
      );
    });

    it("silently strips isSystemTemplate for non-owner on update", async () => {
      const template = {
        id: 6,
        name: "t",
        subject: "Subject t",
        headerBannerUrl: null,
        headerText: null,
        bodyText: "b",
        footerBannerUrl: null,
        footerText: null,
        isSystemTemplate: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serviceMocks.updateManagedEmailTemplate.mockResolvedValue({ ok: true, data: template });

      const app = makeApp(false);
      const res = await app.request("/email-templates/6", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "updated-name", isSystemTemplate: true }),
      });

      expect(res.status).toBe(200);
      const callArg = serviceMocks.updateManagedEmailTemplate.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(callArg.isSystemTemplate).toBeUndefined();
      // Other fields should still pass through
      expect(callArg.name).toBe("updated-name");
    });
  });
});

describe("POST /email-templates/:id/send-test", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the template with sample values and sends it to the current admin", async () => {
    templateRepoMocks.getEmailTemplateById.mockResolvedValue(sampleTemplate);
    adminAuthMocks.getAdminProfileById.mockResolvedValue({ id: 1, email: "admin@lmaa.space" });
    emailMocks.sendMail.mockResolvedValue(true);

    const res = await makeApp(false).request("/email-templates/6/send-test", { method: "POST" });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { sentTo: "admin@lmaa.space" } });
    expect(emailMocks.sendMail).toHaveBeenCalledWith(
      "admin@lmaa.space",
      'Vorschlag "Beispiel-Shop"',
      expect.stringContaining("Beispiel-Shop"),
      { errorSource: "test-email" },
    );
  });

  it("returns 404 when the template does not exist", async () => {
    templateRepoMocks.getEmailTemplateById.mockResolvedValue(null);

    const res = await makeApp(false).request("/email-templates/99/send-test", { method: "POST" });

    expect(res.status).toBe(404);
    expect(emailMocks.sendMail).not.toHaveBeenCalled();
  });

  it("returns 502 when the provider rejects the message", async () => {
    templateRepoMocks.getEmailTemplateById.mockResolvedValue(sampleTemplate);
    adminAuthMocks.getAdminProfileById.mockResolvedValue({ id: 1, email: "admin@lmaa.space" });
    emailMocks.sendMail.mockResolvedValue(false);

    const res = await makeApp(false).request("/email-templates/6/send-test", { method: "POST" });

    expect(res.status).toBe(502);
  });
});
