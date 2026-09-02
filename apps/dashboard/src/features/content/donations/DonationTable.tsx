import { FileTextIcon } from "@phosphor-icons/react";
import { memo, useMemo } from "react";

import { DONATION_PROVIDERS, type Donation } from "@lmaa/contracts";
import { formatEuroCents, fullName } from "@lmaa/shared";
import { SocialMediaIcons } from "@lmaa/ui";

import { BADGE_TONES, Badge } from "@/components/ui/Badge.tsx";
import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useFavicons } from "@/lib/useFavicons.ts";

interface DonationTableProps {
  donations: Donation[];
  onEdit: (donation: Donation) => void;
}

/**
 * The ledger as a table, most recent payment first.
 *
 * The amount is shown here because this is the page for whoever keeps the
 * books. No public route serves it, and nothing on the site does either.
 */
function DonationTableComponent({ donations, onEdit }: DonationTableProps) {
  const { messages } = useI18n();
  // Looked up for the whole table at once, so a site named by two donors is
  // asked about once.
  const favicons = useFavicons(donations.flatMap((donation) => donation.socialMedia));
  const common = messages.common;
  const text = messages.system.donations;

  const columns = useMemo<ColumnDef<Donation>[]>(
    () => [
      {
        id: "name",
        header: text.nameLabel,
        sortKey: (donation) => fullName(donation.firstName, donation.lastName),
        cell: (donation) => (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[var(--ds-text)]">
              {fullName(donation.firstName, donation.lastName)}
            </span>
            {/* Said in the list, because a payment that paid for a sponsorship
                is the one row whose amount is also carried by a second page. */}
            {donation.sponsorId && (
              <Badge className="shrink-0" colorClass={BADGE_TONES.success}>
                {text.sponsorBadge}
              </Badge>
            )}
            {!donation.published && (
              <Badge className="shrink-0" colorClass={BADGE_TONES.neutral}>
                {text.hiddenBadge}
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "socialMedia",
        header: text.socialMediaLabel,
        cell: (donation) => (
          <SocialMediaIcons
            socialMedia={donation.socialMedia}
            favicons={favicons}
            className="flex items-center gap-2"
            linkable={false}
          />
        ),
      },
      {
        id: "provider",
        header: text.providerLabel,
        className: "w-44",
        sortKey: (donation) => donation.provider,
        cell: (donation) => (
          <span className="text-sm text-[var(--ds-text-muted)]">
            {DONATION_PROVIDERS[donation.provider]}
          </span>
        ),
      },
      {
        id: "amount",
        header: text.amountLabel,
        // Money is read against money, so it ends where the next figure ends.
        className: "w-32 text-right",
        sortKey: (donation) => donation.amountCents,
        cell: (donation) => (
          <span className="block text-right text-sm tabular-nums text-[var(--ds-text-muted)]">
            {formatEuroCents(donation.amountCents)}
          </span>
        ),
      },
      {
        id: "receivedAt",
        header: text.receivedAtLabel,
        className: "w-36",
        sortKey: (donation) => donation.receivedAt,
        cell: (donation) => (
          <span className="text-sm tabular-nums text-[var(--ds-text-muted)]">
            {donation.receivedAt}
          </span>
        ),
      },
      {
        id: "actions",
        className: "w-36",
        cell: (donation) => (
          <div className="flex gap-2 justify-end">
            <TableActionButton
              onClick={() => onEdit(donation)}
              icon={<FileTextIcon weight="duotone" className="size-3.5" />}
              label={common.edit}
            />
          </div>
        ),
      },
    ],
    [common, favicons, onEdit, text],
  );

  return (
    <DataTable
      data={donations}
      columns={columns}
      getRowKey={(donation) => donation.id}
      getRowProps={(donation) => ({
        onClick: (event) => {
          // A click on a control inside the row belongs to that control, so the
          // edit button does not open the editor a second time.
          if ((event.target as HTMLElement).closest("button, a")) return;
          onEdit(donation);
        },
        className: "cursor-pointer",
      })}
    />
  );
}

export const DonationTable = memo(DonationTableComponent);
