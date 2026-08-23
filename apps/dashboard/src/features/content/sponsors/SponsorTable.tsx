import { FileTextIcon } from "@phosphor-icons/react";
import { memo, useMemo } from "react";

import type { Sponsor } from "@lmaa/contracts";
import { daysLeft, fullName } from "@lmaa/shared";
import { SocialMediaIcons } from "@lmaa/ui";

import { Avatar } from "@/components/ui/Avatar.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { formatEuro } from "@/features/content/sponsors/sponsor-format.ts";

interface SponsorTableProps {
  sponsors: Sponsor[];
  /** The day the remaining time is counted against, as `YYYY-MM-DD`. */
  today: string;
  onEdit: (sponsor: Sponsor) => void;
}

/**
 * The sponsors as a table.
 *
 * The amount is shown here and nowhere else: it decides whether the year is
 * covered, and that is a question for whoever keeps the books rather than for
 * a visitor.
 */
function SponsorTableComponent({ sponsors, today, onEdit }: SponsorTableProps) {
  const { messages } = useI18n();
  const common = messages.common;
  const text = messages.system.sponsors;

  const columns = useMemo<ColumnDef<Sponsor>[]>(
    () => [
      {
        id: "name",
        header: text.nameLabel,
        sortKey: (sponsor) => fullName(sponsor.firstName, sponsor.lastName),
        cell: (sponsor) => {
          const name = fullName(sponsor.firstName, sponsor.lastName);
          return (
            <div className="flex items-center gap-3">
              <Avatar name={name} imageUrl={sponsor.imageUrl} size="sm" />
              <span className="text-sm font-medium text-[var(--ds-text)]">{name}</span>
            </div>
          );
        },
      },
      {
        id: "socialMedia",
        header: text.socialMediaLabel,
        cell: (sponsor) => (
          <SocialMediaIcons
            socialMedia={sponsor.socialMedia}
            className="flex items-center gap-2"
            linkable={false}
          />
        ),
      },
      {
        id: "amount",
        header: text.amountLabel,
        className: "w-32",
        sortKey: (sponsor) => sponsor.amountCents,
        cell: (sponsor) => (
          <span className="text-sm tabular-nums text-[var(--ds-text-muted)]">
            {formatEuro(sponsor.amountCents)}
          </span>
        ),
      },
      {
        id: "paidAt",
        header: text.paidAtLabel,
        className: "w-36",
        sortKey: (sponsor) => sponsor.paidAt,
        cell: (sponsor) => (
          <span className="text-sm tabular-nums text-[var(--ds-text-muted)]">{sponsor.paidAt}</span>
        ),
      },
      {
        id: "left",
        header: text.remainingLabel,
        className: "w-40",
        cell: (sponsor) => {
          const left = daysLeft(sponsor.paidAt, today);
          return (
            <Badge
              className="shrink-0"
              colorClass={
                left > 0
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-stone-500/10 text-stone-400"
              }
            >
              {left > 0 ? `${left} ${text.daysLeft}` : text.expired}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        className: "w-36",
        cell: (sponsor) => (
          <div className="flex gap-2 justify-end">
            <TableActionButton
              onClick={() => onEdit(sponsor)}
              icon={<FileTextIcon weight="duotone" className="size-3.5" />}
              label={common.edit}
            />
          </div>
        ),
      },
    ],
    [common, onEdit, text, today],
  );

  return <DataTable data={sponsors} columns={columns} getRowKey={(sponsor) => sponsor.id} />;
}

export const SponsorTable = memo(SponsorTableComponent);
