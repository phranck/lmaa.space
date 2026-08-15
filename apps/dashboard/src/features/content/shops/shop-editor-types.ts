import type { AdminShopListItem } from "@lmaa/shared";
import type { ShopEditFormValue } from "@lmaa/ui/shop-edit-form";

export type ShopEditorModeProps = {
  initialData?: Partial<ShopEditFormValue>;
  initialOgImage?: string | null;
  initialShop?: AdminShopListItem;
  /**
   * Changes whenever the record behind {@link initialData} was written to.
   *
   * @remarks
   * The form is seeded once and then belongs to whoever is typing in it. This
   * is the one thing that overrules that: when the automated check writes its
   * research into a suggestion, the form takes the new values, because what the
   * check found is what a moderator is about to decide on.
   */
  dataRevision?: string;
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
  paymentMethods?: unknown;
  notes?: unknown;
  headquarters?: unknown;
  geo?: unknown;
};
