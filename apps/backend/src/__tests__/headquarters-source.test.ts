import { describe, expect, it } from "vitest";

import { mapShopJsonToShopData } from "../lib/shopjson-mapper.js";

describe("headquarters provenance", () => {
  it("carries where the address and the coordinates came from", () => {
    // Both were dropped between the check and the database, so a reviewer saw
    // an address with no way to tell whether it came from the imprint or from
    // a geocoder's guess.
    const mapped = mapShopJsonToShopData(
      {
        name: "Beispielladen",
        url: "https://beispiel.de",
        headquarters: {
          street: "Musterweg 3",
          postalCode: "28195",
          city: "Bremen",
          countryCode: "DE",
          source: "Impressum",
        },
        geo: { latitude: 53.07, longitude: 8.8, source: "Photon (street-level)" },
      },
      new Map(),
    );

    expect(mapped.headquarters?.addressSource).toBe("Impressum");
    expect(mapped.headquarters?.geoSource).toBe("Photon (street-level)");
  });
});
