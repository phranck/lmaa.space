import type { AdminShopListItem } from "@lmaa/shared";
import type { ShopEditFormValue } from "@lmaa/ui";

export type ShopEditorModeProps = {
  initialData?: Partial<ShopEditFormValue>;
  initialOgImage?: string | null;
  initialShop?: AdminShopListItem;
} & ({ shopId: number | "new"; submissionId?: never } | { submissionId: number; shopId?: never });

export type ShopImageState = {
  draftOgImageInput: string | null;
  previewOverride: string | null | undefined;
  previewRequestUrl: string | null;
};

export type RejectState = {
  editingRejection: boolean;
  open: boolean;
  reason: string;
  longText: string;
  token: string | null;
};

export type ShopCheckJsonPayload = {
  name?: unknown;
  url?: unknown;
  description?: unknown;
  categories?: unknown;
  contactEmail?: unknown;
  shippingRegions?: unknown;
  socialMedia?: unknown;
  notes?: unknown;
  headquarters?: unknown;
  geo?: unknown;
};
