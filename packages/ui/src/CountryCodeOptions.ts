import { countryName } from "@lmaa/shared";

export interface CountryCodeOption {
  code: string;
  flag: string;
  name: string;
}

const EUROPEAN_COUNTRY_CODES = [
  "AD",
  "AL",
  "AM",
  "AT",
  "AZ",
  "BA",
  "BE",
  "BG",
  "BY",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GE",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MD",
  "ME",
  "MK",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "RS",
  "SE",
  "SI",
  "SK",
  "SM",
  "TR",
  "UA",
  "VA",
] as const;

export function createDefaultCountryCodeOptions(
  locale: "de" | "en" = "de",
): ReadonlyArray<CountryCodeOption> {
  return EUROPEAN_COUNTRY_CODES.map((code) => ({
    code,
    flag: countryFlag(code),
    name: countryName(code, locale),
  })).sort((left, right) => left.name.localeCompare(right.name, locale));
}

function countryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const offset = 127397;
  return String.fromCodePoint(
    countryCode.toUpperCase().charCodeAt(0) + offset,
    countryCode.toUpperCase().charCodeAt(1) + offset,
  );
}
