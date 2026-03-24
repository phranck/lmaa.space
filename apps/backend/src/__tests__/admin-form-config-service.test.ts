import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  createFormConfig: vi.fn(),
  deleteFormConfig: vi.fn(),
  getActiveFormConfigByName: vi.fn(),
  getActiveFormConfigBySlug: vi.fn(),
  getFormConfigByName: vi.fn(),
  getFormConfigBySlug: vi.fn(),
  importFormConfig: vi.fn(),
  listFormConfigs: vi.fn(),
  setFormConfigActive: vi.fn(),
  upsertFormConfig: vi.fn(),
}));

vi.mock("../repositories/admin-form-config.js", () => repoMocks);

import {
  createManagedAdminFormConfig,
  deleteManagedAdminFormConfig,
  getManagedAdminFormConfigByName,
  getManagedAdminFormConfigs,
  getManagedPublicFormConfig,
  getManagedPublicFormConfigBySlug,
  importManagedFormConfig,
  saveManagedAdminFormConfig,
  setManagedAdminFormConfigActive,
} from "../services/admin-form-config.js";

const mockRow = (overrides = {}) => ({
  id: 1,
  name: "contact",
  slug: "kontakt",
  config: { rows: [], submissionConfig: { steps: [] } },
  isActive: true,
  ...overrides,
});

describe("getManagedAdminFormConfigs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps rows to FormConfig", async () => {
    repoMocks.listFormConfigs.mockResolvedValue([mockRow()]);

    const result = await getManagedAdminFormConfigs();

    expect(result).toEqual([
      {
        id: 1,
        name: "contact",
        slug: "kontakt",
        rows: [],
        isActive: true,
        submissionConfig: { steps: [] },
      },
    ]);
  });
});

describe("getManagedAdminFormConfigByName", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns ok: false when not found", async () => {
    repoMocks.getFormConfigByName.mockResolvedValue(null);
    expect(await getManagedAdminFormConfigByName("missing")).toEqual({ ok: false });
  });

  it("returns mapped config", async () => {
    repoMocks.getFormConfigByName.mockResolvedValue(mockRow());
    const result = await getManagedAdminFormConfigByName("contact");
    expect(result.ok).toBe(true);
  });
});

describe("createManagedAdminFormConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns name_taken when name exists", async () => {
    repoMocks.getFormConfigByName.mockResolvedValue(mockRow());
    const result = await createManagedAdminFormConfig("contact", "kontakt");
    expect(result).toEqual({ ok: false, reason: "name_taken" });
  });

  it("returns slug_taken when slug exists", async () => {
    repoMocks.getFormConfigByName.mockResolvedValue(null);
    repoMocks.getFormConfigBySlug.mockResolvedValue(mockRow());
    const result = await createManagedAdminFormConfig("new-form", "kontakt");
    expect(result).toEqual({ ok: false, reason: "slug_taken" });
  });

  it("creates and returns config", async () => {
    repoMocks.getFormConfigByName.mockResolvedValue(null);
    repoMocks.getFormConfigBySlug.mockResolvedValue(null);
    repoMocks.createFormConfig.mockResolvedValue(mockRow({ id: 2, name: "new-form" }));

    const result = await createManagedAdminFormConfig("new-form", "kontakt");
    expect(result.ok).toBe(true);
  });
});

describe("saveManagedAdminFormConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns slug_taken on conflict", async () => {
    repoMocks.getFormConfigBySlug.mockResolvedValue(mockRow({ name: "other" }));

    const result = await saveManagedAdminFormConfig("contact", {
      rows: [],
      slug: "kontakt",
    } as never);

    expect(result).toEqual({ ok: false, reason: "slug_taken" });
  });

  it("saves when slug belongs to same config", async () => {
    repoMocks.getFormConfigBySlug.mockResolvedValue(mockRow({ name: "contact" }));
    repoMocks.upsertFormConfig.mockResolvedValue(mockRow());

    const result = await saveManagedAdminFormConfig("contact", {
      rows: [],
      slug: "kontakt",
    } as never);

    expect(result.ok).toBe(true);
  });
});

describe("deleteManagedAdminFormConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns ok: true on delete", async () => {
    repoMocks.deleteFormConfig.mockResolvedValue(true);
    expect(await deleteManagedAdminFormConfig("contact")).toEqual({ ok: true });
  });

  it("returns ok: false when not found", async () => {
    repoMocks.deleteFormConfig.mockResolvedValue(false);
    expect(await deleteManagedAdminFormConfig("missing")).toEqual({ ok: false });
  });
});

describe("setManagedAdminFormConfigActive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns ok: false when not found", async () => {
    repoMocks.setFormConfigActive.mockResolvedValue(null);
    expect(await setManagedAdminFormConfigActive("missing", true)).toEqual({ ok: false });
  });

  it("returns updated config", async () => {
    repoMocks.setFormConfigActive.mockResolvedValue(mockRow({ isActive: false }));
    const result = await setManagedAdminFormConfigActive("contact", false);
    expect(result.ok).toBe(true);
  });
});

describe("getManagedPublicFormConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns ok: false when not active", async () => {
    repoMocks.getActiveFormConfigByName.mockResolvedValue(null);
    expect(await getManagedPublicFormConfig("missing")).toEqual({ ok: false });
  });

  it("returns active config", async () => {
    repoMocks.getActiveFormConfigByName.mockResolvedValue(mockRow());
    const result = await getManagedPublicFormConfig("contact");
    expect(result.ok).toBe(true);
  });
});

describe("getManagedPublicFormConfigBySlug", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns ok: false when not found", async () => {
    repoMocks.getActiveFormConfigBySlug.mockResolvedValue(null);
    expect(await getManagedPublicFormConfigBySlug("missing")).toEqual({ ok: false });
  });
});

describe("importManagedFormConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns name_taken when import fails", async () => {
    repoMocks.importFormConfig.mockResolvedValue(null);
    const result = await importManagedFormConfig("contact", { rows: [] } as never);
    expect(result).toEqual({ ok: false, reason: "name_taken" });
  });

  it("imports and returns config", async () => {
    repoMocks.importFormConfig.mockResolvedValue(mockRow());
    const result = await importManagedFormConfig("contact", { rows: [] } as never, true);
    expect(result.ok).toBe(true);
  });
});
