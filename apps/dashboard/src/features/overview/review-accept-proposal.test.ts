import { describe, expect, it } from "vitest";

import { readDeferredAcceptProposal } from "./review-accept-proposal";

/** The smallest acceptance payload that passes the review contract. */
const ACCEPT_PAYLOAD = {
  name: "Beispielladen",
  url: "https://beispiel.de",
  description: "Regionaler Fachhandel mit eigener Werkstatt.",
  categories: ["Werkzeug"],
  shippingRegions: ["EU"],
  legal: { owners: [] },
  headquarters: { source: "Impressum" },
  notes: { focus: [], brandsOrProducts: [] },
};

describe("readDeferredAcceptProposal", () => {
  it("reads an acceptance draft whose application was held by a domain conflict", () => {
    const proposal = readDeferredAcceptProposal({
      state: "completed",
      verdict: "onhold",
      result: { verdict: "accept", accept: ACCEPT_PAYLOAD },
    });

    expect(proposal?.name).toBe("Beispielladen");
  });

  it("reads an acceptance draft from a provider-held review", () => {
    const proposal = readDeferredAcceptProposal({
      state: "completed",
      verdict: "onhold",
      result: { verdict: "onhold", accept: ACCEPT_PAYLOAD },
    });

    expect(proposal?.name).toBe("Beispielladen");
  });

  it("does not expose an ordinary accepted result as a deferred override", () => {
    const proposal = readDeferredAcceptProposal({
      state: "completed",
      verdict: "accept",
      result: { verdict: "accept", accept: ACCEPT_PAYLOAD },
    });

    expect(proposal).toBeNull();
  });
});
