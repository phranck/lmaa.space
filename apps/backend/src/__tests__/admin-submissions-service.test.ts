import { beforeEach, describe, expect, it, vi } from "vitest";

const getSubmissionStatus = vi.fn();
const deleteSubmission = vi.fn();

async function loadServiceModule() {
  vi.resetModules();

  vi.doMock("../repositories/admin-submissions.js", () => ({
    deleteSubmission,
    getSubmissionStatus,
    reviewSubmission: vi.fn(),
  }));

  vi.doMock("../services/preview-images.js", () => ({
    hydrateShopOgImageInBackground: vi.fn(),
  }));

  vi.doMock("../repositories/admin-shops.js", () => ({
    setAdminShopOgImage: vi.fn(),
  }));

  return import("../services/admin-submissions.js");
}

describe("admin-submissions service", () => {
  beforeEach(() => {
    getSubmissionStatus.mockReset();
    deleteSubmission.mockReset();
  });

  it("allows deleting onhold submissions", async () => {
    getSubmissionStatus.mockResolvedValue("onhold");
    deleteSubmission.mockResolvedValue(undefined);
    const service = await loadServiceModule();

    await expect(service.deleteModeratedAdminSubmission(42)).resolves.toEqual({ ok: true });

    expect(getSubmissionStatus).toHaveBeenCalledWith(42);
    expect(deleteSubmission).toHaveBeenCalledWith(42);
  });

  it("allows deleting rejected submissions", async () => {
    getSubmissionStatus.mockResolvedValue("rejected");
    deleteSubmission.mockResolvedValue(undefined);
    const service = await loadServiceModule();

    await expect(service.deleteModeratedAdminSubmission(7)).resolves.toEqual({ ok: true });

    expect(deleteSubmission).toHaveBeenCalledWith(7);
  });

  it("rejects deleting non-moderated submissions", async () => {
    getSubmissionStatus.mockResolvedValue("pending");
    const service = await loadServiceModule();

    await expect(service.deleteModeratedAdminSubmission(9)).resolves.toEqual({
      ok: false,
      reason: "invalid_status",
    });

    expect(deleteSubmission).not.toHaveBeenCalled();
  });
});
