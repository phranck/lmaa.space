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
