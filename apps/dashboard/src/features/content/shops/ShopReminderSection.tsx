import { ClockIcon } from "@phosphor-icons/react";
import { useState } from "react";

import type { ShopReminder } from "@lmaa/shared";

import { useI18n } from "@/context/I18nContext.tsx";
import {
  useDeleteShopReminder,
  useSetShopReminder,
  useShopReminder,
} from "@/features/content/hooks/useAdminShops.ts";

import { RECURRENCE_LABELS } from "./reminder-constants.ts";
import { buildCustomSummary, formatDisplayDate } from "./reminder-utils.ts";
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

  const hasReminder = !!reminder;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ClockIcon weight="duotone" className="w-4 h-4 text-[var(--ds-text-subtle)]" />
        <span className="text-sm font-medium text-[var(--ds-text)]">Erinnerung</span>
      </div>

      {isLoading ? (
        <div className="h-8 w-40 bg-[var(--ds-bg-elevated)] rounded-lg animate-pulse" />
      ) : hasReminder && !editing ? (
        <div className="flex items-start justify-between gap-3 p-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)]">
          <div className="min-w-0">
            <p
              className={`text-sm font-medium ${reminder.isActive ? "text-amber-400" : "text-[var(--ds-text-subtle)] line-through"}`}
            >
              {formatDisplayDate(reminder.remindAt, locale)}
            </p>
            <p className="text-xs text-[var(--ds-text-subtle)] mt-0.5">
              {reminder.isActive ? "Aktiv" : "Inaktiv"}
              {recurrenceSummary(reminder)}
            </p>
            {reminder.note && (
              <p className="text-xs text-[var(--ds-text-subtle)] mt-0.5 truncate">{reminder.note}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 text-xs text-[var(--ds-text-subtle)] hover:text-[var(--ds-text)] underline"
          >
            Bearbeiten
          </button>
        </div>
      ) : (
        <ReminderForm
          initial={editing ? reminder : null}
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
    </div>
  );
}
