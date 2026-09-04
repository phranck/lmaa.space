import { FileTextIcon } from "@phosphor-icons/react";
import { memo, useMemo } from "react";

import type { Sponsor } from "@lmaa/contracts";
import { daysLeft, formatEuroCents, fullName } from "@lmaa/shared";
import { SocialMediaIcons } from "@lmaa/ui";

import { Avatar } from "@/components/ui/Avatar.tsx";
import { BADGE_TONES, Badge } from "@/components/ui/Badge.tsx";
import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useFavicons } from "@/lib/useFavicons.ts";

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
  // Looked up for the whole table at once, so a website named by two sponsors
  // is asked about once.
  const favicons = useFavicons(sponsors.flatMap((sponsor) => sponsor.socialMedia));
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
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={name} imageUrl={sponsor.imageUrl} size="sm" />
              {/* The name shortens rather than widening the column. `min-w-0`
                  is what lets it: a flex item does not shrink below its own
                  content without it, whatever `truncate` says. */}
              <span className="min-w-0 truncate text-sm font-medium text-[var(--ds-text)]">
                {name}
              </span>
              {/* Said in the list, because whether somebody is named is the one
                  thing about them that the page does not show. */}
              {!sponsor.published && (
                <Badge className="shrink-0" colorClass={BADGE_TONES.neutral}>
                  {text.hiddenBadge}
                </Badge>
              )}
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
            favicons={favicons}
            className="flex flex-wrap items-center gap-2"
            linkable={false}
          />
        ),
      },
      {
        id: "amount",
        header: text.amountLabel,
        // Summed by the server from the payments linked to this sponsor, so it
        // covers a renewal too. Shown and not edited: the amount is changed on
        // the ledger page, where the payment itself lives.
        //
        // Money is read against money, so it ends where the next figure ends.
        className: "w-32 text-right",
        sortKey: (sponsor) => sponsor.amountCents,
        cell: (sponsor) => (
          <span className="block text-right text-sm tabular-nums text-[var(--ds-text-muted)]">
            {formatEuroCents(sponsor.amountCents)}
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
              colorClass={left > 0 ? BADGE_TONES.success : BADGE_TONES.neutral}
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
    [common, favicons, onEdit, text, today],
  );

  return (
    <DataTable
      data={sponsors}
      columns={columns}
      getRowKey={(sponsor) => sponsor.id}
      getRowProps={(sponsor) => ({
        onClick: (event) => {
          // A click on a control inside the row belongs to that control. Without
          // this, the edit button would open the editor twice and a link in the
          // icon column would open the editor as well as following itself.
          if ((event.target as HTMLElement).closest("button, a")) return;
          onEdit(sponsor);
        },
        className: "cursor-pointer",
      })}
    />
  );
}

export const SponsorTable = memo(SponsorTableComponent);
