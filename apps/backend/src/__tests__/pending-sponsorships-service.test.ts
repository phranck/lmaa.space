import { beforeEach, describe, expect, it, vi } from "vitest";

import { isValidCreditorReference } from "@lmaa/shared";

const repoMocks = vi.hoisted(() => ({
  insertPendingSponsorship: vi.fn(),
  getPendingSponsorship: vi.fn(),
  deletePendingSponsorship: vi.fn(),
}));

const sponsorRepoMocks = vi.hoisted(() => ({
  insertSponsor: vi.fn(),
}));

const avatarMocks = vi.hoisted(() => ({
  resolveSponsorAvatar: vi.fn(),
}));

vi.mock("../repositories/pending-sponsorships.js", () => repoMocks);
vi.mock("../repositories/sponsors.js", () => sponsorRepoMocks);
vi.mock("../services/sponsor-avatar.js", () => avatarMocks);
vi.mock("../lib/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn() },
}));

import {
  createPendingSponsorship,
  takeOverPendingSponsorship,
} from "../services/pending-sponsorships.js";

/** A form as the contract hands it over, with anything the test cares about on top. */
function form(overrides: Partial<Parameters<typeof createPendingSponsorship>[0]> = {}) {
  return {
    firstName: "Kim",
    lastName: "Lorenz",
    link: "",
    claim: "",
    amountCents: 4500,
    published: true,
    ...overrides,
  };
}

/** A unique violation as the driver raises one for a reference already taken. */
const referenceTaken = { code: "23505", constraint_name: "pending_sponsorships_reference_unique" };

describe("createPendingSponsorship", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMocks.insertPendingSponsorship.mockImplementation(
      async (data: Record<string, unknown>) => ({ id: "row-1", createdAt: new Date(), ...data }),
    );
  });

  it("issues a reference that holds up and says what it is for", async () => {
    const result = await createPendingSponsorship(form());

    expect(result.ok).toBe(true);
    const [stored] = repoMocks.insertPendingSponsorship.mock.calls[0];
    expect(isValidCreditorReference(stored.reference)).toBe(true);
    expect(stored.reference).toMatch(/^RF[0-9]{2}SPON[0-9A-Z]{12}$/);
  });

  it("draws a different reference every time", async () => {
    await createPendingSponsorship(form());
    await createPendingSponsorship(form());

    const [first] = repoMocks.insertPendingSponsorship.mock.calls[0];
    const [second] = repoMocks.insertPendingSponsorship.mock.calls[1];
    expect(first.reference).not.toBe(second.reference);
  });

  it("sorts one address into the service it belongs to", async () => {
    await createPendingSponsorship(form({ link: "https://github.com/kim" }));

    const [stored] = repoMocks.insertPendingSponsorship.mock.calls[0];
    expect(stored.socialMedia).toEqual({ github: "https://github.com/kim" });
  });

  it("files an address on no known service as a website", async () => {
    await createPendingSponsorship(form({ link: "https://kim-lorenz.example" }));

    const [stored] = repoMocks.insertPendingSponsorship.mock.calls[0];
    expect(stored.socialMedia).toEqual({ website: "https://kim-lorenz.example/" });
  });

  it("stores no address when none was given", async () => {
    await createPendingSponsorship(form({ link: "" }));

    const [stored] = repoMocks.insertPendingSponsorship.mock.calls[0];
    expect(stored.socialMedia).toEqual({});
  });

  it("says so rather than dropping an address it cannot place", async () => {
    const result = await createPendingSponsorship(form({ link: "not an address at all" }));

    expect(result).toEqual({ ok: false, reason: "link_unusable" });
    expect(repoMocks.insertPendingSponsorship).not.toHaveBeenCalled();
  });

  it("reads a fediverse handle as the address it is", async () => {
    await createPendingSponsorship(form({ link: "@kim@chaos.social" }));

    const [stored] = repoMocks.insertPendingSponsorship.mock.calls[0];
    expect(stored.socialMedia).toEqual({ mastodon: "https://chaos.social/@kim" });
  });

  it("keeps what the form said, including the answer about being named", async () => {
    await createPendingSponsorship(form({ claim: "Weil es sonst niemand macht.", published: false }));

    const [stored] = repoMocks.insertPendingSponsorship.mock.calls[0];
    expect(stored).toMatchObject({
      firstName: "Kim",
      lastName: "Lorenz",
      claim: "Weil es sonst niemand macht.",
      published: false,
    });
  });

  it("keeps the amount the ladder stood on, which is the one their code carries", async () => {
    await createPendingSponsorship(form({ amountCents: 12_000 }));

    const [stored] = repoMocks.insertPendingSponsorship.mock.calls[0];
    expect(stored.amountCents).toBe(12_000);
  });

  it("draws again when the reference is already taken", async () => {
    repoMocks.insertPendingSponsorship
      .mockRejectedValueOnce(referenceTaken)
      .mockResolvedValueOnce({ id: "row-2", reference: "RF00SPONSECOND" });

    const result = await createPendingSponsorship(form());

    expect(result.ok).toBe(true);
    expect(repoMocks.insertPendingSponsorship).toHaveBeenCalledTimes(2);
    const [first] = repoMocks.insertPendingSponsorship.mock.calls[0];
    const [second] = repoMocks.insertPendingSponsorship.mock.calls[1];
    expect(first.reference).not.toBe(second.reference);
  });

  it("gives up once the draw keeps landing on a taken reference", async () => {
    repoMocks.insertPendingSponsorship.mockRejectedValue(referenceTaken);

    const result = await createPendingSponsorship(form());

    expect(result).toEqual({ ok: false, reason: "reference_unavailable" });
    expect(repoMocks.insertPendingSponsorship).toHaveBeenCalledTimes(3);
  });

  it("passes on a failure that is not a taken reference", async () => {
    repoMocks.insertPendingSponsorship.mockRejectedValue(new Error("connection lost"));

    await expect(createPendingSponsorship(form())).rejects.toThrow("connection lost");
    expect(repoMocks.insertPendingSponsorship).toHaveBeenCalledTimes(1);
  });
});

describe("takeOverPendingSponsorship", () => {
  /** An entry as it stands in the table when the money arrives. */
  const entry = {
    id: "entry-1",
    reference: "RF18SPON26001",
    firstName: "Kim",
    lastName: "Lorenz",
    socialMedia: { github: "https://github.com/kim" },
    claim: "Weil es sonst niemand macht.",
    published: false,
    createdAt: new Date("2026-08-01T10:00:00Z"),
  };

  const payment = { amountCents: 4500, paidAt: "2026-08-23" };

  beforeEach(() => {
    vi.clearAllMocks();
    repoMocks.getPendingSponsorship.mockResolvedValue(entry);
    repoMocks.deletePendingSponsorship.mockResolvedValue(true);
    avatarMocks.resolveSponsorAvatar.mockResolvedValue("https://example.test/kim.png");
    sponsorRepoMocks.insertSponsor.mockImplementation(
      async (data: Record<string, unknown>) => ({ id: "sponsor-1", ...data }),
    );
  });

  it("takes the person from the entry and the payment from the caller", async () => {
    const result = await takeOverPendingSponsorship("entry-1", payment);

    expect(result.ok).toBe(true);
    expect(sponsorRepoMocks.insertSponsor).toHaveBeenCalledWith({
      firstName: "Kim",
      lastName: "Lorenz",
      socialMedia: { github: "https://github.com/kim" },
      imageUrl: "https://example.test/kim.png",
      claim: "Weil es sonst niemand macht.",
      published: false,
      amountCents: 4500,
      paidAt: "2026-08-23",
    });
  });

  it("looks for the picture only now, when somebody has read the entry", async () => {
    await takeOverPendingSponsorship("entry-1", payment);

    expect(avatarMocks.resolveSponsorAvatar).toHaveBeenCalledWith({
      github: "https://github.com/kim",
    });
  });

  it("stores no picture when none was found", async () => {
    avatarMocks.resolveSponsorAvatar.mockResolvedValue(null);

    await takeOverPendingSponsorship("entry-1", payment);

    const [stored] = sponsorRepoMocks.insertSponsor.mock.calls[0];
    expect(stored.imageUrl).toBe("");
  });

  it("removes the entry once the sponsor is written", async () => {
    await takeOverPendingSponsorship("entry-1", payment);

    expect(repoMocks.deletePendingSponsorship).toHaveBeenCalledWith("entry-1");
  });

  it("leaves the entry standing when the sponsor could not be written", async () => {
    sponsorRepoMocks.insertSponsor.mockRejectedValue(new Error("connection lost"));

    await expect(takeOverPendingSponsorship("entry-1", payment)).rejects.toThrow("connection lost");
    expect(repoMocks.deletePendingSponsorship).not.toHaveBeenCalled();
  });

  it("says so when the entry is already gone", async () => {
    repoMocks.getPendingSponsorship.mockResolvedValue(null);

    const result = await takeOverPendingSponsorship("entry-1", payment);

    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(sponsorRepoMocks.insertSponsor).not.toHaveBeenCalled();
  });
});
