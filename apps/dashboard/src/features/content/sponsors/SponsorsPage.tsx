import { CoinsIcon, HandHeartIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import {
  SPONSORING_DEFAULTS,
  type RunningCostItem,
  type SponsoringConfig,
} from "@lmaa/contracts";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { CreateActionButton, SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { DashboardInput, DashboardNumberInput } from "@/components/ui/DashboardControls.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { formatEuro } from "@/features/content/sponsors/sponsor-format.ts";
import { SponsorEditorCard } from "@/features/content/sponsors/SponsorEditorCard.tsx";
import { SponsorTable } from "@/features/content/sponsors/SponsorTable.tsx";

import {
  useSaveSponsoringConfig,
  useSponsoringConfig,
  useSponsors,
} from "./hooks/useSponsors.ts";

/**
 * Lists the people who carry the running costs, and what those costs are.
 *
 * The costs sit under the list because the site subtracts one from the other:
 * what the sponsors gave against what the year costs decides whether the page
 * says the costs are covered or how much is still missing.
 */
/** A cost line whilst it is being edited, with an identity of its own. */
interface CostRow extends RunningCostItem {
  id: string;
}

/** The running costs and the threshold, as the form holds them. */
interface CostDraft {
  costs: CostRow[];
  minAmountCents: number;
}

let costRowCount = 0;

/**
 * A key for a cost line that survives the line above it being deleted.
 *
 * The stored configuration is a plain list with no identity, so the position
 * would be the only key available, and a deleted line would then hand its
 * position to its neighbour.
 *
 * @returns An identifier unique within this page's lifetime.
 */
function nextCostId(): string {
  costRowCount += 1;
  return `cost-${costRowCount}`;
}

/**
 * Turns the stored configuration into what the form edits.
 *
 * @param config - What the backend holds, or nothing whilst it loads.
 * @returns The cost lines with identities, and the threshold in force.
 */
function toDraft(config: SponsoringConfig | undefined): CostDraft {
  return {
    costs: (config?.costs ?? []).map((item) => ({ ...item, id: nextCostId() })),
    minAmountCents: config?.minAmountCents ?? SPONSORING_DEFAULTS.minAmountCents,
  };
}

/**
 * Drops the editing identities again, so what is saved is what is stored.
 *
 * @param draft - The form's current state.
 * @returns The configuration as the backend takes it.
 */
function toConfig(draft: CostDraft): SponsoringConfig {
  return {
    costs: draft.costs.map(({ id: _id, ...item }) => item),
    minAmountCents: draft.minAmountCents,
  };
}

export function SponsorsPage() {
  const { messages } = useI18n();
  const common = messages.common;
  const text = messages.system.sponsors;

  const { data: sponsors, isLoading } = useSponsors();
  const { data: config } = useSponsoringConfig();
  const saveConfig = useSaveSponsoringConfig();
  const [draft, setDraft] = useState<CostDraft | null>(null);
  /** Which sponsor the card is showing, or nothing when it is closed. */
  const [editing, setEditing] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const stored = useMemo<CostDraft>(() => toDraft(config), [config]);
  const current = draft ?? stored;
  const totalCents = current.costs.reduce((sum, item) => sum + item.amountCents, 0);

  function updateConfig(next: CostDraft) {
    setDraft(next);
  }

  function updateCost(id: string, patch: Partial<RunningCostItem>) {
    updateConfig({
      ...current,
      costs: current.costs.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });
  }

  return (
    <PageLayout>
      <PageHeader title={text.title}>
        <CreateActionButton onClick={() => setEditing("new")} label={text.newSponsor} />
      </PageHeader>

      <PageBody className="overflow-y-auto">
        <DashboardSection collapsible defaultExpanded={false} className="sticky top-0 z-10 mb-4">
          <DashboardSection.Header
            icon={<CoinsIcon weight="duotone" className="size-4" />}
            title={text.costsTitle}
            subtitle={`${text.costsHint} ${formatEuro(totalCents)}`}
            addOn={
              <SaveActionButton
                onClick={() =>
                  saveConfig.mutate(toConfig(current), { onSuccess: () => setDraft(null) })
                }
                disabled={draft === null || saveConfig.isPending}
                busy={saveConfig.isPending}
                label={saveConfig.isPending ? common.saving : common.save}
                size="control"
              />
            }
          />
          <DashboardSection.Body>
            <div className="space-y-3">
              {current.costs.map((item, index) => (
                <div key={item.id} className="flex items-end gap-3">
                  <DashboardInput
                    label={index === 0 ? text.costLabelLabel : undefined}
                    value={item.label}
                    fieldClassName="flex-1"
                    onChange={(event) => updateCost(item.id, { label: event.target.value })}
                  />
                  <DashboardNumberInput
                    label={index === 0 ? text.costAmountLabel : undefined}
                    value={item.amountCents / 100}
                    min={0}
                    step={1}
                    className="w-32"
                    onChange={(event) =>
                      updateCost(item.id, {
                        amountCents: Math.round(Number(event.target.value) * 100),
                      })
                    }
                  />
                  <DashboardButton
                    variant="ghost"
                    aria-label={common.delete}
                    onClick={() =>
                      updateConfig({
                        ...current,
                        costs: current.costs.filter((row) => row.id !== item.id),
                      })
                    }
                  >
                    <TrashIcon weight="duotone" className="size-4" />
                  </DashboardButton>
                </div>
              ))}

              <DashboardButton
                variant="ghost"
                onClick={() =>
                  updateConfig({
                    ...current,
                    costs: [...current.costs, { id: nextCostId(), label: "", amountCents: 0 }],
                  })
                }
              >
                <PlusIcon weight="bold" className="size-4" />
                {text.addCost}
              </DashboardButton>

              <div className="pt-2 border-t border-[var(--ds-border-subtle)]">
                <DashboardNumberInput
                  label={text.minAmountLabel}
                  hint={text.minAmountHint}
                  value={current.minAmountCents / 100}
                  min={0}
                  step={1}
                  className="w-32"
                  onChange={(event) =>
                    updateConfig({
                      ...current,
                      minAmountCents: Math.round(Number(event.target.value) * 100),
                    })
                  }
                />
              </div>
            </div>
          </DashboardSection.Body>
        </DashboardSection>

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
