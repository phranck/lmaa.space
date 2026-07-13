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

const COUNTRY_DISPLAY_NAMES: Readonly<Record<"de" | "en", Intl.DisplayNames>> = {
  de: new Intl.DisplayNames(["de"], { type: "region" }),
  en: new Intl.DisplayNames(["en"], { type: "region" }),
};

export function createDefaultCountryCodeOptions(
  locale: "de" | "en" = "de",
): ReadonlyArray<CountryCodeOption> {
  const displayNames = COUNTRY_DISPLAY_NAMES[locale];
  return EUROPEAN_COUNTRY_CODES.map((code) => ({
    code,
    flag: countryFlag(code),
    name: displayNames.of(code) ?? code,
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
