import type { Reducer } from "react";

import type { AdminLocale, AdminUser } from "@lmaa/shared";

export type EditableRole = "admin" | "moderator";

export interface AvatarState {
  previewUrl: string | null;
  pendingFile: File | null;
  pendingGravatarUrl: string | null;
  deleted: boolean;
}

export interface UserEditDraftState {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  locale: AdminLocale;
  role: EditableRole;
  logoutConfirm: boolean;
  avatar: AvatarState;
}

export type UserEditField = "username" | "email" | "password" | "firstName" | "lastName";

export type UserEditDraftAction =
  | { type: "setField"; field: UserEditField; value: string }
  | { type: "setLocale"; value: AdminLocale }
  | { type: "setRole"; value: EditableRole }
  | { type: "setLogoutConfirm"; value: boolean }
  | { type: "setAvatar"; value: AvatarState };

export const EMPTY_AVATAR_STATE: AvatarState = {
  previewUrl: null,
  pendingFile: null,
  pendingGravatarUrl: null,
  deleted: false,
};

export const userEditDraftReducer: Reducer<UserEditDraftState, UserEditDraftAction> = (state, action) => {
  switch (action.type) {
    case "setField":
      return { ...state, [action.field]: action.value };
    case "setLocale":
      return { ...state, locale: action.value };
    case "setRole":
      return { ...state, role: action.value };
    case "setLogoutConfirm":
      return { ...state, logoutConfirm: action.value };
    case "setAvatar":
      return { ...state, avatar: action.value };
    default:
      return state;
  }
};

export function createInitialDraft(user: AdminUser): UserEditDraftState {
  return {
    username: user.username,
    email: user.email,
    password: "",
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    locale: user.locale,
    role: user.role === "moderator" ? "moderator" : "admin",
    logoutConfirm: localStorage.getItem("logout-skip-confirm") !== "true",
    avatar: { ...EMPTY_AVATAR_STATE, previewUrl: user.avatarUrl ?? null },
  };
}
