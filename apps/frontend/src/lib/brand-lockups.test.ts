import { describe, expect, it } from "vitest";

import githubLockupSvg from "@/assets/brands/github-lockup.svg?raw";
import paypalLockupSvg from "@/assets/brands/paypal-lockup.svg?raw";
import sepaLockupSvg from "@/assets/brands/sepa-lockup.svg?raw";

import { type BrandLockupName, recolorSvg, SALON_LOCKUP_COLORS } from "./brand-lockups";

const PUBLISHED: Record<BrandLockupName, string> = {
  github: githubLockupSvg,
  paypal: paypalLockupSvg,
  sepa: sepaLockupSvg,
};

describe.each(Object.entries(PUBLISHED) as [BrandLockupName, string][])(
  "the %s lockup in Salon",
  (name, svg) => {
    const colors = SALON_LOCKUP_COLORS[name];

    // A file replaced by a newer one from its owner can write its colors
    // differently, and the rendition would then keep the brand's own color
    // without anything saying so.
    it.each(Object.keys(colors))("finds %s in the published file", (published) => {
      expect(svg).toContain(published);
    });

    it("keeps none of the colors it replaces", () => {
      const rendition = recolorSvg(svg, colors);
      for (const published of Object.keys(colors)) {
        expect(rendition).not.toContain(published);
      }
    });
  },
);

it("keeps SEPA's yellow euro", () => {
  const yellow = "rgb(98.431373%,73.72549%,3.529412%)";
  expect(sepaLockupSvg).toContain(yellow);
  expect(recolorSvg(sepaLockupSvg, SALON_LOCKUP_COLORS.sepa)).toContain(yellow);
});
