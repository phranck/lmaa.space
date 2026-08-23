import { beforeEach, describe, expect, it, vi } from "vitest";

import { isValidCreditorReference } from "@lmaa/shared";

const repoMocks = vi.hoisted(() => ({
  insertPendingSponsorship: vi.fn(),
}));

vi.mock("../repositories/pending-sponsorships.js", () => repoMocks);
vi.mock("../lib/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn() },
}));

import { createPendingSponsorship } from "../services/pending-sponsorships.js";

/** A form as the contract hands it over, with anything the test cares about on top. */
function form(overrides: Partial<Parameters<typeof createPendingSponsorship>[0]> = {}) {
  return {
    firstName: "Kim",
    lastName: "Lorenz",
    link: "",
    claim: "",
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
