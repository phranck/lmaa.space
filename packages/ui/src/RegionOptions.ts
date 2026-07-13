import { REGION_CODES, type RegionCode } from "@lmaa/shared";

export interface RegionSelectOption {
  code: RegionCode;
  flag: string;
  name: string;
}

export const REGION_FLAGS: Readonly<Record<RegionCode, string>> = {
  DE: "🇩🇪",
  AT: "🇦🇹",
  CH: "🇨🇭",
  EU: "🇪🇺",
  WORLD: "🌍",
};

export function createRegionOptions(
  regionNames: Readonly<Record<RegionCode, string>>,
): ReadonlyArray<RegionSelectOption> {
  return REGION_CODES.map((code) => ({ code, flag: REGION_FLAGS[code], name: regionNames[code] }));
}

export function createDefaultRegionOptions(
  locale: "de" | "en" = "de",
): ReadonlyArray<RegionSelectOption> {
  return createRegionOptions(
    locale === "en"
      ? { DE: "Germany", AT: "Austria", CH: "Switzerland", EU: "Europe", WORLD: "World" }
      : { DE: "Deutschland", AT: "Österreich", CH: "Schweiz", EU: "Europa", WORLD: "Weltweit" },
  );
}
