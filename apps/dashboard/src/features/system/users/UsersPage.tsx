import { TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Avatar } from "@/components/ui/Avatar.tsx";
import { BADGE_TONES, Badge } from "@/components/ui/Badge.tsx";
import { ItemCard } from "@/components/ui/Card.tsx";
import {
  CancelActionButton,
  CreateActionButton,
  EditActionButton,
  RemoveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useAdminUsers, useDeleteUser } from "@/features/system/hooks/useAdminUsers.ts";
import { USER_ROLE_COLORS } from "@/features/system/users/user-role-colors.ts";

import { UserCreateCard } from "./UserCreateCard.tsx";
import { UserEditCard } from "./UserEditCard.tsx";

/**
 * User management route for admins/owners.
 *
 * @returns Users administration page.
 */
export function UsersPage() {
  const { messages } = useI18n();
  const common = messages.common;
  const usersMessages = messages.users;
  const { user: me } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const { data: users = [], isLoading } = useAdminUsers();
  const deleteMutation = useDeleteUser();

  const deleteTarget = users.find((u) => u.id === deleteId);

  return (
    <PageLayout>
      <PageHeader title={usersMessages.title}>
        <CreateActionButton onClick={() => setShowCreate(true)} label={usersMessages.inviteUser} />
      </PageHeader>

      <PageBody>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => `sk-${i}`).map((key) => (
              <ItemCard key={key} className="h-16 animate-pulse" />
            ))}
          </div>
        )}

        <div className="space-y-2">
          {users.map((user) => (
            <ItemCard key={user.id} className="px-5 py-4 flex items-center gap-3">
              <Avatar name={user.username} imageUrl={user.avatarUrl} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-[var(--ds-text)]">{user.username}</p>
                  <Badge colorClass={USER_ROLE_COLORS[user.role]}>
                    {usersMessages.role[user.role]}
                  </Badge>
                  {user.id === me?.id && (
                    <Badge colorClass={BADGE_TONES.neutral}>{usersMessages.you}</Badge>
                  )}
                </div>
                <p className="text-sm text-[var(--ds-text-subtle)]">{user.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(me?.isOwner || user.id === me?.id) && (
                  <EditActionButton
                    onClick={() => setEditingUserId(user.id)}
                    label={usersMessages.editCard.editTooltip}
                    variant="neutral"
                  />
                )}
                {me?.isOwner && user.id !== me?.id && (
                  <RemoveActionButton
                    onClick={() => setDeleteId(user.id)}
                    label={usersMessages.remove}
                  />
                )}
              </div>
            </ItemCard>
          ))}
        </div>
      </PageBody>

      <Dialog
        open={deleteId !== null && !!deleteTarget}
        title={usersMessages.removeConfirmTitle}
        titleIcon={<TrashIcon weight="duotone" className={dialogHeaderIconClass} />}
        onClose={() => setDeleteId(null)}
      >
        <div className="px-6 py-3">
          <p className="text-sm text-[var(--ds-text-muted)]">
            <span className="font-medium">{deleteTarget?.username}</span>{" "}
            {usersMessages.removeConfirmDescription}
          </p>
        </div>
        <Dialog.Footer>
          <CancelActionButton label={common.cancel} onClick={() => setDeleteId(null)} />
          <RemoveActionButton
            disabled={deleteMutation.isPending}
            label={deleteMutation.isPending ? "…" : common.remove}
            onClick={() => {
              if (deleteId !== null)
                deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
            }}
          />
        </Dialog.Footer>
      </Dialog>

      {showCreate && <UserCreateCard onClose={() => setShowCreate(false)} onCreated={() => {}} />}

      {editingUserId !== null && (
        <UserEditCard
          userId={editingUserId}
          onClose={() => setEditingUserId(null)}
          onSaved={() => setEditingUserId(null)}
        />
      )}
    </PageLayout>
  );
}
