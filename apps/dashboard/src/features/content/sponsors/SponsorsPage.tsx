import { HandHeartIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { CreateActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { SponsorEditorCard } from "@/features/content/sponsors/SponsorEditorCard.tsx";
import { SponsorTable } from "@/features/content/sponsors/SponsorTable.tsx";

import { useSponsors } from "./hooks/useSponsors.ts";

/**
 * The people who carry the running costs.
 *
 * What those costs are and what it takes to be named for a year are set under
 * the sponsoring settings instead, because neither figure belongs to any one
 * sponsor and both outlive every entry in this list.
 */
export function SponsorsPage() {
  const { messages } = useI18n();
  const text = messages.system.sponsors;

  const { data: sponsors, isLoading } = useSponsors();
  /** Which sponsor the card is showing, or nothing when it is closed. */
  const [editing, setEditing] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <PageLayout>
      <PageHeader title={text.title}>
        <CreateActionButton onClick={() => setEditing("new")} label={text.newSponsor} />
      </PageHeader>

      <PageBody className="overflow-y-auto">
        {isLoading && (
          <div className="space-y-px">
            {Array.from({ length: 4 }, (_, index) => `skeleton-${index}`).map((key) => (
              <div
                key={key}
                className="h-14 bg-[var(--ds-surface)] animate-pulse border-b border-[var(--ds-border-subtle)]"
              />
            ))}
          </div>
        )}

        {!isLoading && (sponsors?.length ?? 0) === 0 && (
          <ContentUnavailableView
            icon={<HandHeartIcon weight="duotone" aria-hidden />}
            title={text.emptyTitle}
            subtitle={text.emptyHint}
            className="flex-1 min-h-0"
          />
        )}

        {!isLoading && (sponsors?.length ?? 0) > 0 && (
          // The table fills the card to its edges, so the card's own corners
          // are the table's corners and there is no seam between the two.
          <DashboardSection className="overflow-hidden">
            <SponsorTable
              sponsors={sponsors ?? []}
              today={today}
              onEdit={(sponsor) => setEditing(sponsor.id)}
            />
          </DashboardSection>
        )}
      </PageBody>

      <SponsorEditorCard sponsorId={editing} onClose={() => setEditing(null)} />
    </PageLayout>
  );
}
