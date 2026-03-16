import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AdminShopListItem,
  Shop,
  ShopMutableVisibility,
  ShopVisibility,
} from "@lmaa/shared";
import type { ShopEditFormValue } from "@lmaa/ui";

import type { ShopDeleteMode } from "@/features/content/shops/ShopDeleteReasonCard.tsx";
import { api } from "@/lib/api.ts";

/**
 * Re-exported form value type used by shop editor views.
 */
export type { ShopEditFormValue };

function parseCoordinate(value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toHeadquartersPayload(data: ShopEditFormValue) {
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

function toShopCheckNotesPayload(data: ShopEditFormValue) {
  return data.shopCheckNotes ?? null;
}

/**
 * Loads admin shop summaries, optionally filtered by visibility.
 *
 * @param visibility - Optional visibility filter.
 * @returns React Query result with shop rows.
 */
export function useAdminShops(visibility?: ShopVisibility) {
  return useQuery({
    queryKey: ["shops-admin", visibility],
    queryFn: () =>
      api.get<AdminShopListItem[]>(`/admin/shops${visibility ? `?visibility=${visibility}` : ""}`),
  });
}

type ShopVisibilityCounts = Record<ShopVisibility | "all", number>;

/**
 * Loads shop counts grouped by visibility.
 *
 * @returns React Query result with counts per visibility.
 */
export function useShopVisibilityCounts() {
  return useQuery({
    queryKey: ["shops-admin", "counts"],
    queryFn: () => api.get<ShopVisibilityCounts>("/admin/shops/counts"),
  });
}

/**
 * Updates visibility (`public`/`onhold`/`rejected`) for one shop.
 *
 * @returns React Query mutation for visibility updates.
 */
export function useSetShopVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      visibility,
      rejectionToken,
      rejectionAdminNote,
      rejectionLongText,
    }: {
      id: number;
      visibility: ShopMutableVisibility;
      rejectionToken?: string;
      rejectionAdminNote?: string | null;
      rejectionLongText?: string | null;
    }) =>
      api.patch(`/admin/shops/${id}/visibility`, {
        visibility,
        rejectionToken,
        rejectionAdminNote,
        rejectionLongText,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
      qc.invalidateQueries({ queryKey: ["shop", variables.id] });
    },
  });
}

function getAdminShopQueryKey(id: number | null) {
  return ["shop", id] as const;
}

function getAdminShopQueryFn(id: number) {
  return () => api.get<Shop>(`/admin/shops/${id}`);
}

/**
 * Loads one shop detail for edit mode.
 *
 * @param id - Shop id or `null` to disable fetching.
 * @returns React Query result with shop detail.
 */
export function useAdminShop(id: number | null) {
  return useQuery({
    queryKey: getAdminShopQueryKey(id),
    queryFn: id === null ? undefined : getAdminShopQueryFn(id),
    enabled: id !== null,
  });
}

export function getAdminShopQueryOptions(id: number) {
  return {
    queryKey: getAdminShopQueryKey(id),
    queryFn: getAdminShopQueryFn(id),
  };
}

/**
 * Creates or updates a shop depending on presence of `editId`.
 *
 * @param editId - Existing shop id or `null` for create mode.
 * @returns React Query mutation for save operations.
 */
export function useSaveShop(editId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formData, needsReview }: { formData: ShopEditFormValue; needsReview?: boolean }) =>
      editId
        ? api.patch<Shop>(`/admin/shops/${editId}`, {
            ...formData,
            headquarters: toHeadquartersPayload(formData),
            shopCheckNotes: toShopCheckNotesPayload(formData),
            ...(needsReview !== undefined ? { needsReview } : {}),
          })
        : api.post<Shop>("/admin/shops", {
            ...formData,
            headquarters: toHeadquartersPayload(formData),
            shopCheckNotes: toShopCheckNotesPayload(formData),
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
      if (editId) qc.invalidateQueries({ queryKey: ["shop", editId] });
    },
  });
}

type ShopcheckImportResult = { imported: number; skipped: number; errors: string[] };

/**
 * Imports shopcheck results-state.json into the shop list.
 * Each entry maps its ShopJson to the matching shop and sets needsReview=true.
 *
 * @returns React Query mutation returning import statistics.
 */
export function useImportShopcheckResults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { entries: Array<{ shopId: number; shopJson?: Record<string, unknown> | null }> }) =>
      api.post<ShopcheckImportResult>("/admin/shops/import", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shops-admin"] }),
  });
}

/**
 * Deletes or soft-deletes a shop with optional reason metadata.
 *
 * @returns React Query mutation.
 */
export function useDeleteShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      reason,
      wasReported,
      mode,
    }: {
      id: number;
      reason?: string;
      wasReported?: boolean;
      mode?: ShopDeleteMode;
    }) =>
      api.delete(`/admin/shops/${id}`, {
        reason: reason ?? null,
        wasReported: wasReported ?? false,
        mode: mode ?? "mark_deleted",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shops-admin"] }),
  });
}

/**
 * Updates the delete reason of a soft-deleted shop.
 *
 * @returns React Query mutation.
 */
export function useUpdateDeleteReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string | null }) =>
      api.patch(`/admin/shops/${id}/delete-reason`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shops-admin"] }),
  });
}

/**
 * Requests a preview OG image URL for an arbitrary shop URL.
 *
 * @returns React Query mutation returning preview image data.
 */
export function useFetchPreviewImage() {
  return useMutation({
    mutationFn: (url: string) =>
      api.post<{ ogImage: string | null }>("/admin/preview-image", { url }),
  });
}

/**
 * Loads a preview OG image for an arbitrary shop URL.
 *
 * @param url - Target shop URL or `null` to disable loading.
 * @returns React Query result with preview image data.
 */
export function usePreviewImage(url: string | null) {
  return useQuery({
    queryKey: ["preview-image", url],
    queryFn: () => api.post<{ ogImage: string | null }>("/admin/preview-image", { url }),
    enabled: typeof url === "string" && url.trim().length > 0,
  });
}

/**
 * Refetches/stores OG image for an existing shop.
 *
 * @param shopId - Shop id.
 * @returns React Query mutation.
 */
export function useRefetchShopImage(shopId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ogImage: string | null }>(`/admin/shops/${shopId}/refetch-image`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop", shopId] });
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
    },
  });
}

export function useSetShopOgImage(shopId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ogImage: string | null) =>
      api.patch<{ ogImage: string | null }>(`/admin/shops/${shopId}/og-image`, { ogImage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop", shopId] });
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
    },
  });
}
