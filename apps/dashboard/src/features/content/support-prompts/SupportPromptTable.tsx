import { FileTextIcon } from "@phosphor-icons/react";
import { memo, useMemo } from "react";

import type { SupportPrompt } from "@lmaa/contracts";

import { Badge } from "@/components/ui/Badge.tsx";
import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { promptState } from "@/features/content/support-prompts/support-prompt-state.ts";

interface SupportPromptTableProps {
  prompts: SupportPrompt[];
  /** The day the states are judged against, as `YYYY-MM-DD`. */
  today: string;
  onEdit: (prompt: SupportPrompt) => void;
}

/**
 * The prompts as a table, with the same row shape as the other tables in the
 * dashboard: what it is, where it goes, what it does today, and one action.
 */
function SupportPromptTableComponent({ prompts, today, onEdit }: SupportPromptTableProps) {
  const { messages } = useI18n();
  const common = messages.common;
  const text = messages.system.supportPrompts;

  const slotLabels: Record<SupportPrompt["slot"], string> = useMemo(
    () => ({
      "my-shops": text.slots.myShops,
      "shop-detail": text.slots.shopDetail,
      "category-grid": text.slots.categoryGrid,
    }),
    [text],
  );

  const columns = useMemo<ColumnDef<SupportPrompt>[]>(
    () => [
      {
        id: "name",
        header: text.nameLabel,
        sortKey: (prompt) => prompt.name,
        cell: (prompt) => (
          <span className="text-sm font-medium text-[var(--ds-text)]">{prompt.name}</span>
        ),
      },
      {
        id: "slot",
        header: text.slotLabel,
        sortKey: (prompt) => prompt.slot,
        cell: (prompt) => (
          <span className="text-sm text-[var(--ds-text-muted)]">{slotLabels[prompt.slot]}</span>
        ),
      },
      {
        id: "threshold",
        header: text.thresholdLabel,
        sortKey: (prompt) => prompt.threshold,
        className: "w-28",
        cell: (prompt) => (
          <span className="text-sm tabular-nums text-[var(--ds-text-muted)]">
            {prompt.threshold}
          </span>
        ),
      },
      {
        id: "window",
        header: text.windowColumn,
        cell: (prompt) =>
          prompt.startsAt || prompt.endsAt ? (
            <span className="text-sm tabular-nums text-[var(--ds-text-muted)]">
              {prompt.startsAt ?? "…"} – {prompt.endsAt ?? "…"}
            </span>
          ) : (
            <span className="text-sm text-[var(--ds-text-subtle)]">–</span>
          ),
      },
      {
        id: "state",
        header: text.stateColumn,
        className: "w-32",
        cell: (prompt) => {
          const state = promptState(prompt, today);
          return (
            <Badge
              className="shrink-0"
              colorClass={
                state === "live"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-stone-500/10 text-stone-400"
              }
            >
              {text.states[state]}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        className: "w-36",
        cell: (prompt) => (
          <div className="flex gap-2 justify-end">
            <TableActionButton
              onClick={() => onEdit(prompt)}
              icon={<FileTextIcon weight="duotone" className="size-3.5" />}
              label={common.edit}
            />
          </div>
        ),
      },
    ],
    [common, onEdit, slotLabels, text, today],
  );

  return <DataTable data={prompts} columns={columns} getRowKey={(prompt) => prompt.id} />;
}

export const SupportPromptTable = memo(SupportPromptTableComponent);
