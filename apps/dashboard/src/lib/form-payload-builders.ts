import type { ShopEditFormValue } from "@lmaa/ui";

export function parseCoordinate(value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function toHeadquartersPayload(data: ShopEditFormValue) {
  return {
    street: optionalText(data.headquartersStreet),
    postalCode: optionalText(data.headquartersPostalCode),
    city: optionalText(data.headquartersCity),
    state: optionalText(data.headquartersState),
    countryCode: optionalText(data.headquartersCountryCode),
    latitude: parseCoordinate(data.headquartersLatitude),
    longitude: parseCoordinate(data.headquartersLongitude),
  };
}
