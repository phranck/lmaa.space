import { describe, expect, it } from "vitest";

import { buildEpcQrPayload, EpcQrError } from "./epc-qr.js";

const PAYEE = {
  beneficiaryName: "Frank Gregor",
  iban: "AT55 1900 1047 0466 6811",
  bic: "TRBKATW2XXX",
  remittance: "Spende: lmaa.space",
};

describe("buildEpcQrPayload", () => {
  it("emits the fixed header a banking app matches on", () => {
    const lines = buildEpcQrPayload(PAYEE).split("\n");
    expect(lines[0]).toBe("BCD");
    expect(lines[1]).toBe("002");
    expect(lines[2]).toBe("1");
    expect(lines[3]).toBe("SCT");
  });

  it("strips the spaces a person types into an IBAN", () => {
    const lines = buildEpcQrPayload(PAYEE).split("\n");
    expect(lines[6]).toBe("AT551900104704666811");
  });

  it("writes the amount with a full stop, whatever the host locale would do", () => {
    const lines = buildEpcQrPayload({ ...PAYEE, amountEur: 15 }).split("\n");
    expect(lines[7]).toBe("EUR15.00");
  });

  it("leaves the amount empty so the payer can choose it", () => {
    const lines = buildEpcQrPayload(PAYEE).split("\n");
    expect(lines[7]).toBe("");
  });

  it("drops trailing empty fields rather than ending on a separator", () => {
    const payload = buildEpcQrPayload({
      beneficiaryName: "Frank Gregor",
      iban: "AT551900104704666811",
    });
    expect(payload.endsWith("\n")).toBe(false);
    expect(payload.split("\n")).toHaveLength(7);
  });

  it("keeps the remittance as the last field", () => {
    const lines = buildEpcQrPayload({ ...PAYEE, amountEur: 5 }).split("\n");
    expect(lines).toHaveLength(11);
    expect(lines[10]).toBe("Spende: lmaa.space");
  });

  it("refuses an IBAN that is not shaped like one", () => {
    expect(() => buildEpcQrPayload({ ...PAYEE, iban: "not-an-iban" })).toThrow(EpcQrError);
  });

  it("refuses an amount below the smallest the format allows", () => {
    expect(() => buildEpcQrPayload({ ...PAYEE, amountEur: 0 })).toThrow(
      expect.objectContaining({ code: "amount-out-of-range" }),
    );
  });

  it("refuses a payload past the 331 byte limit", () => {
    expect(() =>
      buildEpcQrPayload({
        ...PAYEE,
        // 140 characters is the field maximum, and multi-byte characters push
        // the finished payload past the limit even though the field fits.
        remittance: "ü".repeat(140),
      }),
    ).toThrow(expect.objectContaining({ code: "payload-too-large" }));
  });

  it("counts bytes rather than characters when checking the limit", () => {
    const asciiFits = buildEpcQrPayload({ ...PAYEE, remittance: "x".repeat(140) });
    expect(new TextEncoder().encode(asciiFits).length).toBeLessThanOrEqual(331);
  });
});
