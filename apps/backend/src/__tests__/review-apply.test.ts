import { beforeEach, describe, expect, it, vi } from "vitest";

import { REJECT_TOKEN_PLACEHOLDER, REVIEW_RESULT_SCHEMA_VERSION } from "@lmaa/contracts";
import type { ReviewResult } from "@lmaa/contracts";

vi.mock("../db/client.js", () => ({
  db: { select: () => ({ from: () => Promise.resolve([{ id: 7, name: "Werkzeug" }]) }) },
}));

const submissionRepository = vi.hoisted(() => ({
  editSubmission: vi.fn(),
  setReadyForReview: vi.fn(),
}));
vi.mock("../repositories/admin-submissions.js", () => submissionRepository);

const moderation = vi.hoisted(() => ({ reviewAdminSubmission: vi.fn() }));
vi.mock("../services/admin-submissions.js", () => moderation);

const { applyReviewResult, insertRejectionToken } = await import("../services/review/apply.js");

const criteria = {
  independentOnlinePresence: "pass",
  basedInEurope: "pass",
  notALargeCompany: "pass",
  notAMarketplace: "pass",
  notDropshipping: "pass",
  notAChain: "pass",
  notAnAffiliatePortal: "pass",
  noFarRightTies: "pass",
} as const;

const companySize = {
  employees: 9,
  revenueEur: null,
  referenceYear: 2025,
  isEstimate: false,
  sources: [],
  assessment: "Neun Mitarbeitende laut eigener Über-uns-Seite.",
};

const evidence = [
  { url: "https://beispiel.de", label: "Startseite", retrievedAt: "2026-08-15T10:00:00.000Z" },
];

function acceptResult(): ReviewResult {
  return {
    schemaVersion: REVIEW_RESULT_SCHEMA_VERSION,
    verdict: "accept",
    criteria,
    companySize,
    evidence,
    uncertainties: [],
    accept: {
      name: "Beispielladen",
      url: "https://beispiel.de",
      description: "**Beispielladen** in Bremen.",
      categories: ["Werkzeug"],
      contactEmail: "hallo@beispiel.de",
      shippingRegions: ["EU"],
      legal: {
        entityName: "Beispielladen GmbH",
        entityType: "GmbH",
        owners: [],
        headquartersSource: "Impressum",
      },
      headquarters: {
        street: "Musterweg 3",
        postalCode: "28195",
        city: "Bremen",
        state: null,
        countryCode: "DE",
        source: "Impressum",
      },
      geo: { latitude: 53.07, longitude: 8.8, source: "Photon (street-level)" },
      socialMedia: {},
      notes: { focus: [], brandsOrProducts: [], companyPresentation: null },
    },
  } as unknown as ReviewResult;
}

function rejectResult(): ReviewResult {
  return {
    schemaVersion: REVIEW_RESULT_SCHEMA_VERSION,
    verdict: "reject",
    criteria: { ...criteria, notAMarketplace: "fail" },
    companySize,
    evidence,
    uncertainties: [],
    reject: {
      comment: `**Beispielladen** ist ein Marktplatz.\n\nhttps://lmaa.space/rejected/${REJECT_TOKEN_PLACEHOLDER}`,
      longText: "## Einleitung\n\nText.",
      sources: [],
    },
  } as unknown as ReviewResult;
}

function onholdResult(): ReviewResult {
  return {
    schemaVersion: REVIEW_RESULT_SCHEMA_VERSION,
    verdict: "onhold",
    criteria: { ...criteria, basedInEurope: "unclear" },
    companySize,
    evidence,
    uncertainties: [],
    onhold: { reason: "Versandgebiet unklar.", missing: ["Versandgebiet"] },
  } as unknown as ReviewResult;
}

function settings(overrides: Record<string, unknown> = {}) {
  return {
    mode: "assist",
    autoApply: [],
    model: "claude-opus-5",
    effort: "high",
    maxAttempts: 3,
    costLimitPerCheckNano: 2_000_000_000n,
    costLimitPerDayNano: 10_000_000_000n,
    reportEnabled: false,
    reportTemplateId: null,
    notifyAcceptTemplateId: null,
    notifyRejectTemplateId: null,
    ...overrides,
  } as Parameters<typeof applyReviewResult>[0]["settings"];
}

beforeEach(() => {
  vi.clearAllMocks();
  submissionRepository.editSubmission.mockResolvedValue({ id: 42 });
  submissionRepository.setReadyForReview.mockResolvedValue(undefined);
  moderation.reviewAdminSubmission.mockResolvedValue({ ok: true, submission: { id: 42 } });
});

describe("insertRejectionToken", () => {
  it("replaces every placeholder with the generated token", () => {
    const comment = `a ${REJECT_TOKEN_PLACEHOLDER} b ${REJECT_TOKEN_PLACEHOLDER}`;
    expect(insertRejectionToken(comment, "abc")).toBe("a abc b abc");
  });

  it("leaves a comment without a placeholder untouched", () => {
    expect(insertRejectionToken("ohne Platzhalter", "abc")).toBe("ohne Platzhalter");
  });
});

describe("applyReviewResult", () => {
  it("changes nothing when the automation is off", async () => {
    const outcome = await applyReviewResult({
      submissionId: 42,
      result: acceptResult(),
      settings: settings({ mode: "off" }),
    });

    expect(outcome.kind).toBe("none");
    expect(submissionRepository.editSubmission).not.toHaveBeenCalled();
    expect(submissionRepository.setReadyForReview).not.toHaveBeenCalled();
    expect(moderation.reviewAdminSubmission).not.toHaveBeenCalled();
  });

  it("changes nothing whilst automation is off", async () => {
    const outcome = await applyReviewResult({
      submissionId: 42,
      result: acceptResult(),
      settings: settings({ mode: "off" }),
    });

    expect(outcome.kind).toBe("none");
    expect(moderation.reviewAdminSubmission).not.toHaveBeenCalled();
  });

  it("writes the researched data and marks the suggestion ready in assist mode", async () => {
    const outcome = await applyReviewResult({
      submissionId: 42,
      result: acceptResult(),
      settings: settings(),
    });

    expect(outcome.kind).toBe("enriched");
    expect(submissionRepository.editSubmission).toHaveBeenCalledOnce();
    expect(submissionRepository.setReadyForReview).toHaveBeenCalledWith(42, true);
    expect(moderation.reviewAdminSubmission).not.toHaveBeenCalled();
  });

  it("maps the acceptance payload onto the submission fields", async () => {
    await applyReviewResult({ submissionId: 42, result: acceptResult(), settings: settings() });

    const [, editData] = submissionRepository.editSubmission.mock.calls[0];
    expect(editData).toMatchObject({
      shopName: "Beispielladen",
      shopUrl: "https://beispiel.de",
      region: ["EU"],
      categoryIds: [7],
      contactEmail: "hallo@beispiel.de",
    });
  });

  it("approves only when acceptance is explicitly enabled", async () => {
    const outcome = await applyReviewResult({
      submissionId: 42,
      result: acceptResult(),
      settings: settings({ autoApply: ["accept"] }),
    });

    expect(outcome).toEqual({ kind: "applied", status: "approved" });
    expect(moderation.reviewAdminSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42, status: "approved", adminId: null }),
    );
  });

  it("resolves a domain conflict to on hold rather than overwriting", async () => {
    moderation.reviewAdminSubmission.mockResolvedValue({
      ok: false,
      reason: "shop_exists",
      existingShopName: "Anderer Laden",
    });

    const outcome = await applyReviewResult({
      submissionId: 42,
      result: acceptResult(),
      settings: settings({ autoApply: ["accept"] }),
    });

    expect(outcome.kind).toBe("conflict");
  });

  it("keeps a rejection out of public view unless it is explicitly enabled", async () => {
    const outcome = await applyReviewResult({
      submissionId: 42,
      result: rejectResult(),
      settings: settings(),
    });

    expect(outcome.kind).toBe("flagged");
    expect(moderation.reviewAdminSubmission).not.toHaveBeenCalled();
    expect(submissionRepository.setReadyForReview).toHaveBeenCalledWith(42, true);
  });

  it("generates the rejection token in the backend and substitutes it", async () => {
    await applyReviewResult({
      submissionId: 42,
      result: rejectResult(),
      settings: settings({ autoApply: ["reject"] }),
    });

    const [payload] = moderation.reviewAdminSubmission.mock.calls[0];
    expect(payload.rejectionToken).toMatch(/^[0-9a-f]{32}$/);
    expect(payload.adminNote).not.toContain(REJECT_TOKEN_PLACEHOLDER);
    expect(payload.adminNote).toContain(payload.rejectionToken);
    expect(payload.adminId).toBeNull();
  });

  it("enabling acceptance does not also enable rejection", async () => {
    const outcome = await applyReviewResult({
      submissionId: 42,
      result: rejectResult(),
      settings: settings({ autoApply: ["accept"] }),
    });

    expect(outcome.kind).toBe("flagged");
    expect(moderation.reviewAdminSubmission).not.toHaveBeenCalled();
  });

  it("marks an on-hold verdict for a human without changing the status", async () => {
    const outcome = await applyReviewResult({
      submissionId: 42,
      result: onholdResult(),
      settings: settings({ autoApply: ["accept", "reject"] }),
    });

    expect(outcome.kind).toBe("flagged");
    expect(submissionRepository.setReadyForReview).toHaveBeenCalledWith(42, true);
    expect(moderation.reviewAdminSubmission).not.toHaveBeenCalled();
  });

  it("reports a vanished submission instead of throwing", async () => {
    submissionRepository.editSubmission.mockResolvedValue(null);

    const outcome = await applyReviewResult({
      submissionId: 42,
      result: acceptResult(),
      settings: settings(),
    });

    expect(outcome.kind).toBe("none");
  });
});

describe("notifying whoever suggested the shop", () => {
  it("writes with the configured template when the automation admits a shop", async () => {
    // The moderator picks a template in the decision dialog. The automation has
    // nobody to pick, so it took none, and an automatically applied decision
    // reached the site without anybody being told.
    await applyReviewResult({
      submissionId: 42,
      result: acceptResult(),
      settings: settings({ autoApply: ["accept"], notifyAcceptTemplateId: 7 }),
    });

    expect(moderation.reviewAdminSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", notificationTemplateId: 7 }),
    );
  });

  it("writes with the rejection template when the automation rejects", async () => {
    await applyReviewResult({
      submissionId: 42,
      result: rejectResult(),
      settings: settings({ autoApply: ["reject"], notifyRejectTemplateId: 9 }),
    });

    expect(moderation.reviewAdminSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ status: "rejected", notificationTemplateId: 9 }),
    );
  });

  it("sends nothing when no template is chosen, because the choice is the switch", async () => {
    await applyReviewResult({
      submissionId: 42,
      result: acceptResult(),
      settings: settings({ autoApply: ["accept"] }),
    });

    expect(moderation.reviewAdminSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ notificationTemplateId: undefined }),
    );
  });

  it("does not take the admission template for a rejection", async () => {
    await applyReviewResult({
      submissionId: 42,
      result: rejectResult(),
      settings: settings({ autoApply: ["reject"], notifyAcceptTemplateId: 7 }),
    });

    expect(moderation.reviewAdminSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ status: "rejected", notificationTemplateId: undefined }),
    );
  });
});
