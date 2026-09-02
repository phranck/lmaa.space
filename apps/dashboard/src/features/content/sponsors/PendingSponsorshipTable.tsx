import { HandHeartIcon, TrashIcon } from "@phosphor-icons/react";
import { memo, useMemo } from "react";

import { formatCreditorReference, formatEuroCents, fullName } from "@lmaa/shared";
import { SocialMediaIcons } from "@lmaa/ui";

import { BADGE_TONES, Badge } from "@/components/ui/Badge.tsx";
import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import type { PendingSponsorshipRow } from "@/features/content/sponsors/hooks/usePendingSponsorships.ts";
import { useFavicons } from "@/lib/useFavicons.ts";

interface PendingSponsorshipTableProps {
  entries: PendingSponsorshipRow[];
  onTakeOver: (entry: PendingSponsorshipRow) => void;
  onDelete: (entry: PendingSponsorshipRow) => void;
}

/**
 * The announcements waiting for their payment.
 *
 * The reference is the column that matters, because it is the only thing the
 * transfer carries and therefore the only way to tell which of these rows the
 * money on the statement belongs to. It is shown in the groups of four it is
 * printed in, which is how it appears in a banking app.
 */
function PendingSponsorshipTableComponent({
  entries,
  onTakeOver,
  onDelete,
}: PendingSponsorshipTableProps) {
  const { messages } = useI18n();
  // Looked up for the whole table at once, so a website named twice is asked
  // about once.
  const favicons = useFavicons(entries.flatMap((entry) => entry.socialMedia));
  const common = messages.common;
  const text = messages.system.pendingSponsorships;
  const sponsorText = messages.system.sponsors;

  const columns = useMemo<ColumnDef<PendingSponsorshipRow>[]>(
    () => [
      {
        id: "reference",
        header: text.referenceLabel,
        className: "w-64",
        sortKey: (entry) => entry.reference,
        cell: (entry) => (
          <span className="text-sm font-mono whitespace-nowrap text-[var(--ds-text)]">
            {formatCreditorReference(entry.reference)}
          </span>
        ),
      },
      {
        id: "name",
        header: sponsorText.nameLabel,
        sortKey: (entry) => fullName(entry.firstName, entry.lastName),
        cell: (entry) => (
          <div className="flex items-center gap-3">
            {/* A name is one thing and is read as one, so it keeps its line and
                takes the width it needs. */}
            <span className="text-sm font-medium text-[var(--ds-text)] whitespace-nowrap">
              {fullName(entry.firstName, entry.lastName)}
            </span>
            {!entry.published && (
              <Badge className="shrink-0" colorClass={BADGE_TONES.neutral}>
                {sponsorText.hiddenBadge}
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "socialMedia",
        header: sponsorText.socialMediaLabel,
        className: "w-24",
        cell: (entry) => (
          <SocialMediaIcons
            socialMedia={entry.socialMedia}
            favicons={favicons}
            className="flex items-center gap-2"
            linkable={false}
          />
        ),
      },
      {
        id: "claim",
        // The sentence takes whatever the row has left after the fixed columns,
        // which is what `max-w-0` on the cell means in a table sized by its
        // contents: without it the cell grows to the longest sentence and there
        // is nothing left to truncate against.
        className: "w-full max-w-0",
        header: sponsorText.claimLabel,
        cell: (entry) => (
          // One line, cut where the column ends. The whole sentence is a
          // hover away rather than pushing every row to two lines for the sake
          // of the longest one.
          <span className="block truncate text-sm text-[var(--ds-text-muted)]" title={entry.claim}>
            {entry.claim}
          </span>
        ),
      },
      {
        id: "amount",
        // What they said they would give rather than what arrived, which is why
        // the takeover asks again against the statement.
        header: sponsorText.amountLabel,
        // Money is read against money, so it ends where the next figure ends.
        className: "w-32 text-right",
        sortKey: (entry) => entry.amountCents,
        cell: (entry) => (
          <span className="block text-right text-sm tabular-nums whitespace-nowrap text-[var(--ds-text-muted)]">
            {entry.amountCents > 0 ? formatEuroCents(entry.amountCents) : "—"}
          </span>
        ),
      },
      {
        id: "createdAt",
        header: text.announcedLabel,
        className: "w-36",
        sortKey: (entry) => entry.createdAt,
        cell: (entry) => (
          <span className="text-sm tabular-nums whitespace-nowrap text-[var(--ds-text-muted)]">
            {entry.createdAt.slice(0, 10)}
          </span>
        ),
      },
      {
        id: "actions",
        className: "w-72",
        cell: (entry) => (
          <div className="flex gap-2 justify-end">
            <TableActionButton
              onClick={() => onTakeOver(entry)}
              icon={<HandHeartIcon weight="duotone" className="size-3.5" />}
              label={text.takeOver}
              variant="primary"
            />
            <TableActionButton
              onClick={() => onDelete(entry)}
              icon={<TrashIcon weight="duotone" className="size-3.5" />}
              label={common.delete}
              variant="danger"
            />
          </div>
        ),
      },
    ],
    [common, favicons, onDelete, onTakeOver, sponsorText, text],
  );

  return <DataTable data={entries} columns={columns} getRowKey={(entry) => entry.id} />;
}

export const PendingSponsorshipTable = memo(PendingSponsorshipTableComponent);
