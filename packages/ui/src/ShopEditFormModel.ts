import type { PaymentMethodKey, ShopCheckNotes } from "@lmaa/shared";

export interface ShopEditFormValue {
  name: string;
  url: string;
  description: string;
  categoryIds: number[];
  region: string[];
  shipping: string;
  contactEmail: string;
  socialMedia: Record<string, string>;
  paymentMethods: PaymentMethodKey[];
  shopCheckNotes: ShopCheckNotes | null;
  headquartersStreet: string;
  headquartersPostalCode: string;
  headquartersCity: string;
  headquartersState: string;
  headquartersCountryCode: string;
  headquartersLatitude: string;
  headquartersLongitude: string;
  logoBackgroundColor: string | null;
}

export const EMPTY_SHOP_FORM_VALUE: ShopEditFormValue = {
  name: "",
  url: "",
  description: "",
  categoryIds: [],
  region: [],
  shipping: "",
  contactEmail: "",
  socialMedia: {},
  paymentMethods: [],
  shopCheckNotes: null,
  headquartersStreet: "",
  headquartersPostalCode: "",
  headquartersCity: "",
  headquartersState: "",
  headquartersCountryCode: "",
  headquartersLatitude: "",
  headquartersLongitude: "",
  logoBackgroundColor: null,
};
