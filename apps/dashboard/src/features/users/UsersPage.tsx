import { ItemCard } from "@/components/ui/Card.tsx";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useAdminUsers, useDeleteUser } from "@/features/users/hooks/useAdminUsers.ts";
import { useState } from "react";
import { SFLongTextPageAndPencilFill, SFTrashFill } from "sf-symbols-lib/monochrome";
import { UserAvatar } from "./UserAvatar.tsx";
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
    <div>
      <PageHeader title={usersMessages.title}>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="h-9 px-4 bg-[var(--ds-btn-primary-bg)] text-[var(--ds-btn-primary-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] transition-colors"
        >
          {usersMessages.inviteUser}
        </button>
      </PageHeader>

      {/* List */}
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
            <UserAvatar username={user.username} avatarUrl={user.avatarUrl} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-[var(--ds-text)]">{user.username}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.role === "owner"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      : user.role === "admin"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {user.role === "owner"
                    ? usersMessages.role.owner
                    : user.role === "admin"
                      ? usersMessages.role.admin
                      : usersMessages.role.moderator}
                </span>
                {user.id === me?.id && (
                  <span className="text-xs bg-[var(--ds-bg-elevated)] text-[var(--ds-text-muted)] px-2 py-0.5 rounded-full">
                    {usersMessages.you}
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--ds-text-subtle)]">{user.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(me?.isOwner || user.id === me?.id) && (
                <button
                  type="button"
                  onClick={() => setEditingUserId(user.id)}
                  className="h-9 px-3 flex items-center gap-2 rounded-control border border-[var(--ds-border)] text-[var(--ds-text-muted)] text-sm hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)] transition-colors"
                >
                  <SFLongTextPageAndPencilFill className="w-3.5 h-3.5" />
                  {usersMessages.editCard.editTooltip}
                </button>
              )}
              {me?.isOwner && user.id !== me?.id && (
                <button
                  type="button"
                  onClick={() => setDeleteId(user.id)}
                  className="h-9 px-3 flex items-center gap-2 text-sm border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
                >
                  <SFTrashFill className="w-3.5 h-3.5" />
                  {usersMessages.remove}
                </button>
              )}
            </div>
          </ItemCard>
        ))}
      </div>

      <ConfirmDialog
        open={deleteId !== null && !!deleteTarget}
        title={usersMessages.removeConfirmTitle}
        description={
          <>
            <span className="font-medium">{deleteTarget?.username}</span>{" "}
            {usersMessages.removeConfirmDescription}
          </>
        }
        confirmLabel={common.remove}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteId !== null)
            deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
        }}
        onCancel={() => setDeleteId(null)}
      />

      {showCreate && (
        <UserCreateCard
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}

      {editingUserId !== null && (
        <UserEditCard
          userId={editingUserId}
          onClose={() => setEditingUserId(null)}
          onSaved={() => setEditingUserId(null)}
        />
      )}
    </div>
  );
}
