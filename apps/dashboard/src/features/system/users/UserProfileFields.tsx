import type { AdminLocale, AdminUser } from "@lmaa/shared";
import { FormLabel } from "@lmaa/ui/form-primitives";

import {
  DashboardCheckboxField,
  DashboardCombobox,
  DashboardInput,
} from "@/components/ui/DashboardControls.tsx";
import { LanguageToggle } from "@/components/ui/LanguageToggle.tsx";
import type {
  EditableRole,
  UserEditDraftState,
  UserEditField,
} from "@/features/system/users/user-edit-state.ts";
import type { DashboardMessages } from "@/i18n/messages.ts";

interface UserProfileFieldsProps {
  canChangeRole: boolean;
  draft: UserEditDraftState;
  logoutConfirmLabel: string;
  me: AdminUser | null;
  onFieldChange: (field: UserEditField, value: string) => void;
  onLocaleChange: (value: AdminLocale) => void;
  onLogoutConfirmChange: (value: boolean) => void;
  onRoleChange: (value: EditableRole) => void;
  userId: number;
  usersMessages: DashboardMessages["users"];
}

export function UserProfileFields({
  canChangeRole,
  draft,
  logoutConfirmLabel,
  me,
  onFieldChange,
  onLocaleChange,
  onLogoutConfirmChange,
  onRoleChange,
  userId,
  usersMessages,
}: UserProfileFieldsProps) {
  return (
    <div className="flex-1 space-y-3 min-w-0">
      <div>
        <FormLabel htmlFor="user-edit-username">{usersMessages.editCard.username}</FormLabel>
        <DashboardInput
          id="user-edit-username"
          type="text"
          value={draft.username}
          onChange={(e) => onFieldChange("username", e.target.value)}
        />
      </div>

      <div>
        <FormLabel htmlFor="user-edit-email">{usersMessages.editCard.email}</FormLabel>
        <DashboardInput
          id="user-edit-email"
          type="email"
          value={draft.email}
          onChange={(e) => onFieldChange("email", e.target.value)}
        />
      </div>

      <div>
        <FormLabel htmlFor="user-edit-first-name">{usersMessages.editCard.firstName}</FormLabel>
        <DashboardInput
          id="user-edit-first-name"
          type="text"
          value={draft.firstName}
          onChange={(e) => onFieldChange("firstName", e.target.value)}
        />
      </div>

      <div>
        <FormLabel htmlFor="user-edit-last-name">{usersMessages.editCard.lastName}</FormLabel>
        <DashboardInput
          id="user-edit-last-name"
          type="text"
          value={draft.lastName}
          onChange={(e) => onFieldChange("lastName", e.target.value)}
        />
      </div>

      {canChangeRole && (
        <div>
          <FormLabel htmlFor="user-edit-role">{usersMessages.editCard.role}</FormLabel>
          <DashboardCombobox
            id="user-edit-role"
            value={draft.role}
            onValueChange={(value) => onRoleChange(value as EditableRole)}
            options={[
              { value: "admin", label: usersMessages.editCard.roleAdmin },
              { value: "moderator", label: usersMessages.editCard.roleModerator },
            ]}
          />
        </div>
      )}

      <div>
        <FormLabel htmlFor="user-edit-password">{usersMessages.editCard.password}</FormLabel>
        <DashboardInput
          id="user-edit-password"
          type="password"
          value={draft.password}
          onChange={(e) => onFieldChange("password", e.target.value)}
          placeholder={usersMessages.editCard.passwordPlaceholder}
        />
      </div>

      {me?.id === userId && (
        <>
          <div>
            <FormLabel>{usersMessages.editCard.language}</FormLabel>
            <div className="inline-block">
              <LanguageToggle value={draft.locale} onChange={onLocaleChange} />
            </div>
          </div>

          <DashboardCheckboxField
            checked={draft.logoutConfirm}
            className="items-center gap-2 px-[5px] pt-1"
            label={
              <span className="text-xs text-[var(--ds-text-muted)]">{logoutConfirmLabel}</span>
            }
            onCheckedChange={onLogoutConfirmChange}
          />
        </>
      )}
    </div>
  );
}
