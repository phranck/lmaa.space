import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AdminUser } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

/**
 * Form model for creating a new dashboard user.
 */
export interface CreateUserFormData {
  username: string;
  email: string;
  password: string;
  role?: "admin" | "moderator";
  welcomeTemplateId?: number;
}

/**
 * Reusable empty state for the create-user form.
 */
export const EMPTY_CREATE_USER_FORM: CreateUserFormData = {
  username: "",
  email: "",
  password: "",
};

/**
 * Loads all dashboard users.
 *
 * @returns React Query result with user rows.
 */
export function useAdminUsers() {
  return useQuery({
    queryKey: ["users-admin"],
    queryFn: () => api.get<AdminUser[]>("/admin/users"),
  });
}

/**
 * Creates a dashboard user account.
 *
 * @returns React Query mutation.
 */
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserFormData) => api.post("/admin/users", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users-admin"] }),
  });
}

/**
 * Deletes a dashboard user account.
 *
 * @returns React Query mutation.
 */
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users-admin"] }),
  });
}

interface UpdateUserFormData {
  username?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: "admin" | "moderator";
}

/**
 * Updates profile/role fields of an existing dashboard user.
 *
 * @returns React Query mutation.
 */
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserFormData }) =>
      api.patch<AdminUser>(`/admin/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-admin"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

/**
 * Uploads and stores a custom avatar for a user.
 *
 * @returns React Query mutation.
 */
export function useSaveUserAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const fd = new FormData();
      fd.append("avatar", file);
      return api.upload<AdminUser>(`/admin/users/${id}/avatar`, fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-admin"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

/**
 * Sets avatar URL to a Gravatar resource.
 *
 * @returns React Query mutation.
 */
export function useSetGravatarAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, gravatarUrl }: { id: number; gravatarUrl: string }) =>
      api.patch<AdminUser>(`/admin/users/${id}/avatar`, { gravatarUrl }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-admin"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

/**
 * Removes a previously set custom/avatar URL.
 *
 * @returns React Query mutation.
 */
export function useDeleteUserAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}/avatar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-admin"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
