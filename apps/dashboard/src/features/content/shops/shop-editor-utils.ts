import { REGION_CODES } from "@lmaa/shared";
import { EMPTY_SHOP_FORM_VALUE } from "@lmaa/ui";
import type { ShopEditFormValue } from "@lmaa/ui";

import type { useAdminShop } from "./hooks/useAdminShops.ts";
import type { RejectState, ShopCheckJsonPayload, ShopImageState } from "./shop-editor-types.ts";

export function getInitialImageState(
  initialData: Partial<ShopEditFormValue> | undefined,
  initialOgImage: string | null | undefined,
  isSubmissionMode: boolean,
): ShopImageState {
  const trimmedInitialOgImage = initialOgImage?.trim() || null;

  return {
    draftOgImageInput: trimmedInitialOgImage,
    previewOverride: isSubmissionMode && trimmedInitialOgImage ? trimmedInitialOgImage : undefined,
    previewRequestUrl:
      isSubmissionMode && !trimmedInitialOgImage ? initialData?.url?.trim() || null : null,
  };
}

export function getEmptyRejectState(): RejectState {
  return {
    editingRejection: false,
    open: false,
    reason: "",
    longText: "",
    token: null,
  };
}

export function getInitialFormValue(
  initialData: Partial<ShopEditFormValue> | undefined,
  shopData?: Awaited<ReturnType<typeof useAdminShop>>["data"],
): ShopEditFormValue {
  if (!shopData) {
    return { ...EMPTY_SHOP_FORM_VALUE, ...initialData };
  }

  return {
    ...EMPTY_SHOP_FORM_VALUE,
    name: shopData.name,
    url: shopData.url,
    description: shopData.description ?? "",
    categoryIds: shopData.categories.map((category) => category.id),
    region: shopData.region ?? [],
    shipping: shopData.shipping ?? "",
    contactEmail: shopData.contactEmail ?? "",
    socialMedia: shopData.socialMedia ?? {},
    headquartersStreet: shopData.headquarters?.street ?? "",
    headquartersPostalCode: shopData.headquarters?.postalCode ?? "",
    headquartersCity: shopData.headquarters?.city ?? "",
    headquartersState: shopData.headquarters?.state ?? "",
    headquartersCountryCode: shopData.headquarters?.countryCode ?? "",
    headquartersLatitude:
      shopData.headquarters?.latitude !== null && shopData.headquarters?.latitude !== undefined
        ? String(shopData.headquarters.latitude)
        : "",
    headquartersLongitude:
      shopData.headquarters?.longitude !== null && shopData.headquarters?.longitude !== undefined
        ? String(shopData.headquarters.longitude)
        : "",
  };
}

export function formReducer(_state: ShopEditFormValue, nextState: ShopEditFormValue): ShopEditFormValue {
  return nextState;
}

export function isShopWithId(value: unknown): value is { id: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id?: unknown }).id === "number"
  );
}

/**
 * Escapes unescaped control characters (newlines, tabs, etc.) inside JSON string
 * values. Necessary when the user copies JSON from a terminal that renders \n
 * escape sequences as literal line breaks, making the clipboard text invalid JSON.
 */
export function sanitizeJsonControlChars(text: string): string {
  let inString = false;
  let escaped = false;
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (escaped) {
      result += char;
      escaped = false;
    } else if (char === "\\" && inString) {
      result += char;
      escaped = true;
    } else if (char === '"') {
      result += char;
      inString = !inString;
    } else if (inString) {
      const code = char.charCodeAt(0);
      if (code < 0x20) {
        if (char === "\n") result += "\\n";
        else if (char === "\r") result += "\\r";
        else if (char === "\t") result += "\\t";
        else result += `\\u${code.toString(16).padStart(4, "0")}`;
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }
  return result;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => getString(entry))
    .filter((entry): entry is string => entry !== null);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeCategoryName(value: string) {
  return value.trim().toLocaleLowerCase("de-DE");
}

export function applyShopCheckJsonToForm(
  currentForm: ShopEditFormValue,
  payload: ShopCheckJsonPayload,
  categories: { id: number; name: string }[],
): ShopEditFormValue | null {
  const nextForm: ShopEditFormValue = { ...currentForm };
  let changed = false;

  const name = getString(payload.name);
  if (name !== null) {
    nextForm.name = name;
    changed = true;
  }

  const url = getString(payload.url);
  if (url !== null) {
    nextForm.url = url;
    changed = true;
  }

  const description = getString(payload.description);
  if (description !== null) {
    nextForm.description = description;
    changed = true;
  }

  const contactEmail = getString(payload.contactEmail);
  if (contactEmail !== null) {
    nextForm.contactEmail = contactEmail;
    changed = true;
  }

  const categoryNames = getStringArray(payload.categories);
  if (categoryNames.length > 0) {
    const categoryIdByName = new Map(
      categories.map((category) => [normalizeCategoryName(category.name), category.id] as const),
    );
    const categoryIds = categoryNames
      .map((categoryName) => categoryIdByName.get(normalizeCategoryName(categoryName)) ?? null)
      .filter((categoryId): categoryId is number => categoryId !== null);
    if (categoryIds.length > 0) {
      nextForm.categoryIds = Array.from(new Set(categoryIds));
      changed = true;
    }
  }

  const shippingRegions = getStringArray(payload.shippingRegions)
    .map((region) => region.toUpperCase())
    .filter((region): region is (typeof REGION_CODES)[number] =>
      REGION_CODES.includes(region as (typeof REGION_CODES)[number]),
    );
  if (shippingRegions.length > 0) {
    nextForm.region = Array.from(new Set(shippingRegions));
    changed = true;
  }

  const socialMedia = getRecord(payload.socialMedia);
  if (socialMedia !== null) {
    const socialMediaEntries = Object.entries(socialMedia).flatMap(([platform, value]) => {
      const normalizedValue = getString(value);
      return normalizedValue === null ? [] : ([[platform, normalizedValue]] as const);
    });
    const mappedSocialMedia = Object.fromEntries(socialMediaEntries) as Record<string, string>;
    if (Object.keys(mappedSocialMedia).length > 0) {
      nextForm.socialMedia = { ...nextForm.socialMedia, ...mappedSocialMedia };
      changed = true;
    }
  }

  const headquarters = getRecord(payload.headquarters);
  if (headquarters !== null) {
    const street = getString(headquarters.street);
    if (street !== null) {
      nextForm.headquartersStreet = street;
      changed = true;
    }

    const postalCode = getString(headquarters.postalCode);
    if (postalCode !== null) {
      nextForm.headquartersPostalCode = postalCode;
      changed = true;
    }

    const city = getString(headquarters.city);
    if (city !== null) {
      nextForm.headquartersCity = city;
      changed = true;
    }

    const state = getString(headquarters.state);
    if (state !== null) {
      nextForm.headquartersState = state;
      changed = true;
    }

    const countryCode = getString(headquarters.countryCode);
    if (countryCode !== null) {
      nextForm.headquartersCountryCode = countryCode.toUpperCase();
      changed = true;
    }
  }

  const geo = getRecord(payload.geo);
  if (geo !== null) {
    const latitude =
      typeof geo.latitude === "number"
        ? String(geo.latitude)
        : getString(geo.latitude);
    if (latitude !== null) {
      nextForm.headquartersLatitude = latitude;
      changed = true;
    }

    const longitude =
      typeof geo.longitude === "number"
        ? String(geo.longitude)
        : getString(geo.longitude);
    if (longitude !== null) {
      nextForm.headquartersLongitude = longitude;
      changed = true;
    }
  }

  return changed ? nextForm : null;
}
