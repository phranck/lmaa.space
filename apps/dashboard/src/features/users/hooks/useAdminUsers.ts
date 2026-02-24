import { api } from "@/lib/api.ts";
import type { AdminUser } from "@lmaa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface CreateUserFormData {
  username: string;
  email: string;
  password: string;
}

export const EMPTY_CREATE_USER_FORM: CreateUserFormData = {
  username: "",
  email: "",
  password: "",
};

export function useAdminUsers() {
  return useQuery({
    queryKey: ["users-admin"],
    queryFn: () => api.get<AdminUser[]>("/admin/users"),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserFormData) => api.post("/admin/users", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users-admin"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users-admin"] }),
  });
}

export interface UpdateUserFormData {
  username?: string;
  email?: string;
  password?: string;
}

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
