import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AdminShopListItem,
  Shop,
  ShopMutableVisibility,
  ShopReminder,
  ShopVisibility,
} from "@lmaa/shared";
import type { ShopEditFormValue } from "@lmaa/ui/shop-edit-form";

import type { ShopDeleteMode } from "@/features/content/shops/ShopDeleteReasonCard.tsx";
import { api } from "@/lib/api.ts";
import { toHeadquartersPayload } from "@/lib/form-payload-builders.ts";

/**
 * Re-exported form value type used by shop editor views.
 */
export type { ShopEditFormValue };

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
    staleTime: 60 * 1000,
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
    staleTime: 60 * 1000,
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
    queryFn: id === null ? skipToken : getAdminShopQueryFn(id),
    staleTime: 60 * 1000,
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
    mutationFn: ({
      formData,
      needsReview,
    }: {
      formData: ShopEditFormValue;
      needsReview?: boolean;
    }) =>
      editId
        ? api.patch<Shop>(`/admin/shops/${editId}`, {
            ...formData,
            headquarters: toHeadquartersPayload(formData),
            ...(needsReview !== undefined ? { needsReview } : {}),
          })
        : api.post<Shop>("/admin/shops", {
            ...formData,
            headquarters: toHeadquartersPayload(formData),
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
      if (editId) qc.invalidateQueries({ queryKey: ["shop", editId] });
    },
  });
}

type ShopReviewImportResult = { imported: number; skipped: number; errors: string[] };

/**
 * Imports shop review JSON into the shop list.
 * Each entry maps its ShopJson to the matching shop and sets needsReview=true.
 *
 * @returns React Query mutation returning import statistics.
 */
export function useImportShopReviewResults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entries: Array<Record<string, unknown>>) =>
      api.post<ShopReviewImportResult>("/admin/shops/import", entries),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shops-admin"] }),
  });
}

export function useAcceptShopReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<Shop>(`/admin/shops/${id}/accept-review`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
      qc.invalidateQueries({ queryKey: ["shop", id] });
    },
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
    onSuccess: ({ ogImage }) => {
      qc.setQueryData<Shop | undefined>(["shop", shopId], (current) =>
        current ? { ...current, ogImage } : current,
      );
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
    onSuccess: ({ ogImage }) => {
      qc.setQueryData<Shop | undefined>(["shop", shopId], (current) =>
        current ? { ...current, ogImage } : current,
      );
      qc.invalidateQueries({ queryKey: ["shop", shopId] });
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
    },
  });
}

/**
 * Loads the current admin's reminder for a specific shop.
 *
 * @param shopId - Shop id or `null` to disable fetching.
 * @returns React Query result with reminder or `null`.
 */
export function useShopReminder(shopId: number | null) {
  return useQuery({
    queryKey: ["shop-reminder", shopId],
    queryFn: () => api.get<ShopReminder | null>(`/admin/shops/${shopId}/reminder`),
    enabled: shopId !== null && shopId !== 0,
  });
}

/**
 * Sets or replaces the reminder for a shop.
 *
 * @param shopId - Shop id.
 * @returns React Query mutation.
 */
export function useSetShopReminder(shopId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      remindAt,
      note,
      isActive,
      recurrence,
      recurrenceCustomDays,
      recurrenceUnit,
      recurrenceDaysOfWeek,
      sendEmail,
      emailTemplateId,
    }: {
      remindAt: string;
      note?: string | null;
      isActive?: boolean;
      recurrence?: string;
      recurrenceCustomDays?: number | null;
      recurrenceUnit?: string | null;
      recurrenceDaysOfWeek?: string | null;
      sendEmail?: boolean;
      emailTemplateId?: number | null;
    }) =>
      api.post<ShopReminder>(`/admin/shops/${shopId}/reminder`, {
        remindAt,
        note,
        isActive,
        recurrence,
        recurrenceCustomDays,
        recurrenceUnit,
        recurrenceDaysOfWeek,
        sendEmail,
        emailTemplateId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-reminder", shopId] });
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
    },
  });
}

/**
 * Deletes the reminder for a shop.
 *
 * @param shopId - Shop id.
 * @returns React Query mutation.
 */
export function useDeleteShopReminder(shopId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/admin/shops/${shopId}/reminder`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-reminder", shopId] });
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
    },
  });
}
