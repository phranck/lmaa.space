import { BellIcon, BellSlashIcon, ClockIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { formatDateTime, type ShopReminder } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";
import { ToggleSwitch } from "@lmaa/ui/toggle-switch";

import { EditActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications.ts";

import {
  useDeleteShopReminder,
  useSetShopReminder,
  useShopReminder,
} from "./hooks/useAdminShops.ts";
import { RECURRENCE_LABELS } from "./reminder-constants.ts";
import { buildCustomSummary } from "./reminder-utils.ts";
import { ReminderForm } from "./ReminderForm.tsx";

interface ShopReminderSectionProps {
  shopId: number;
}

function recurrenceSummary(r: ShopReminder): string {
  if (r.recurrence === "never") return "";
  if (r.recurrence === "custom") return buildCustomSummary(r);
  return ` · ${RECURRENCE_LABELS[r.recurrence]}`;
}

/**
 * Inline section in the shop editor for managing a per-admin reminder.
 */
export function ShopReminderSection({ shopId }: ShopReminderSectionProps) {
  const { locale } = useI18n();
  const { data: reminder, isLoading } = useShopReminder(shopId);
  const setMutation = useSetShopReminder(shopId);
  const deleteMutation = useDeleteShopReminder(shopId);
  const [editing, setEditing] = useState(false);
  const [isActive, setIsActive] = useState(reminder?.isActive ?? false);
  const push = usePushNotifications();

  const hasReminder = !!reminder;

  const expanded = isActive || hasReminder;
  const showPushPrompt = push.state === "unsubscribed" || push.state === "prompt";

  return (
    <DashboardSection expanded={expanded}>
      <DashboardSection.Header
        icon={<ClockIcon weight="duotone" className="size-4" />}
        title="Erinnerung"
        addOn={
          <ToggleSwitch
            checked={isActive}
            onChange={(v) => {
              setIsActive(() => v);
              if (!v && !hasReminder) setEditing(false);
            }}
          />
        }
      />

      {expanded && (
        <DashboardSection.Body>
          {showPushPrompt && (
            <DashboardButton
              onClick={() => push.enable()}
              className="w-full justify-start"
              leadingIcon={<BellIcon weight="duotone" className="size-3.5 text-amber-400" />}
              variant="neutral"
            >
              Push-Benachrichtigungen aktivieren
            </DashboardButton>
          )}
          {push.state === "denied" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-control border border-[var(--ds-danger-border)] bg-[var(--ds-danger-bg)] text-xs text-[var(--ds-danger-text)]">
              <BellSlashIcon weight="duotone" className="size-3.5" />
              Push-Benachrichtigungen blockiert
            </div>
          )}

          {isLoading ? (
            <div className="h-8 w-40 bg-[var(--ds-bg-elevated)] rounded-lg animate-pulse" />
          ) : hasReminder && !editing ? (
            <div className="flex items-start justify-between gap-3 p-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)]">
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium ${reminder.isActive ? "text-amber-400" : "text-[var(--ds-text-subtle)] line-through"}`}
                >
                  {formatDateTime(reminder.remindAt, locale)}
                </p>
                <p className="text-xs text-[var(--ds-text-subtle)] mt-0.5">
                  {reminder.isActive ? "Aktiv" : "Inaktiv"}
                  {recurrenceSummary(reminder)}
                </p>
                {reminder.note && (
                  <p className="text-xs text-[var(--ds-text-subtle)] mt-0.5 break-words">
                    {reminder.note}
                  </p>
                )}
              </div>
              <EditActionButton
                onClick={() => setEditing(true)}
                className="shrink-0"
                label="Bearbeiten"
              />
            </div>
          ) : (
            <ReminderForm
              initial={editing ? reminder : null}
              isActive={isActive}
              isPending={setMutation.isPending}
              isDeleting={deleteMutation.isPending}
              onSave={(data) => {
                setMutation.mutate(data, { onSuccess: () => setEditing(false) });
              }}
              onDelete={
                hasReminder
                  ? () => {
                      deleteMutation.mutate(undefined, { onSuccess: () => setEditing(false) });
                    }
                  : undefined
              }
            />
          )}
        </DashboardSection.Body>
      )}
    </DashboardSection>
  );
}
