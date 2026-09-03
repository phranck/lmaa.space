import {
  BankIcon,
  CoinsIcon,
  MedalIcon,
  NoteIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { SPONSORING_DEFAULTS, type RunningCostItem, type SponsoringConfig } from "@lmaa/contracts";
import { MAX_REMITTANCE_UNSTRUCTURED, formatEuroCents } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { CopyableCode } from "@/components/ui/CopyableCode.tsx";
import { SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { DashboardInput, DashboardNumberInput } from "@/components/ui/DashboardControls.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

import { useSaveSponsoringConfig, useSponsoringConfig } from "./hooks/useSponsors.ts";

/** A cost line whilst it is being edited, with an identity of its own. */
interface CostRow extends RunningCostItem {
  id: string;
}

/** Everything the settings hold, as the form holds it whilst being edited. */
interface CostDraft {
  costs: CostRow[];
  minAmountCents: number;
  payeeName: string;
  payeeIban: string;
  payeeBic: string;
  purposeDonation: string;
  purposeSponsor: string;
  purposePaypal: string;
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
    payeeName: config?.payeeName ?? "",
    payeeIban: config?.payeeIban ?? "",
    payeeBic: config?.payeeBic ?? "",
    purposeDonation: config?.purposeDonation ?? SPONSORING_DEFAULTS.purposeDonation,
    purposeSponsor: config?.purposeSponsor ?? SPONSORING_DEFAULTS.purposeSponsor,
    purposePaypal: config?.purposePaypal ?? SPONSORING_DEFAULTS.purposePaypal,
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
    payeeName: draft.payeeName,
    payeeIban: draft.payeeIban,
    payeeBic: draft.payeeBic,
    purposeDonation: draft.purposeDonation,
    purposeSponsor: draft.purposeSponsor,
    purposePaypal: draft.purposePaypal,
  };
}

/**
 * What the year costs, and what it takes to be named for one.
 *
 * The site subtracts one from the other: what the sponsors gave against what
 * the year costs is what decides whether the page says the costs are covered or
 * how much is still missing. Neither figure belongs to any one sponsor, which
 * is why they are set here rather than beside the list of them.
 */
/**
 * The name of a variable a field publishes, ready to be copied.
 *
 * @param name - The variable, without its braces.
 * @param before - A sentence that belongs in front of it, where the field has
 *   something else to say as well.
 */
function VariableHint({ name, before }: { name: string; before?: string }) {
  const { messages } = useI18n();
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {/* Each sentence is its own element, because two text nodes side by side
          are one flex item and the gap between them never appears. */}
      {before && <span>{before}</span>}
      <span>{messages.system.sponsors.variableLabel}</span>
      <CopyableCode value={`{${name}}`} copyLabel={messages.common.copy} />
    </span>
  );
}

export function SponsoringSettingsPage() {
  const { messages } = useI18n();
  const common = messages.common;
  const text = messages.system.sponsors;

  const { data: config } = useSponsoringConfig();
  const saveConfig = useSaveSponsoringConfig();
  const [draft, setDraft] = useState<CostDraft | null>(null);

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
      <PageHeader title={messages.layout.sidebar.sponsoringSettings}>
        {/* One button for the page, because both cards edit one configuration
            and one write stores it. Two identical buttons would ask which. */}
        <SaveActionButton
          onClick={() => saveConfig.mutate(toConfig(current), { onSuccess: () => setDraft(null) })}
          disabled={draft === null || saveConfig.isPending}
          busy={saveConfig.isPending}
          label={saveConfig.isPending ? common.saving : common.save}
        />
      </PageHeader>

      <PageBody className="overflow-y-auto">
        {/* The items on the left and the payee on the right, because the list
            is read down whilst the three lines beside it are read across. */}
        <div className="grid gap-4 md:grid-cols-7 items-start">
          <div className="grid gap-4 md:col-span-3">
            <DashboardSection>
              <DashboardSection.Header
                icon={<CoinsIcon weight="duotone" className="size-4" />}
                title={text.costsTitle}
                addOn={
                  // The sum stands in the header's own row rather than under the
                  // title, because it is the answer this card exists to give and a
                  // subtitle is where explanations go.
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[var(--ds-text-muted)]">{text.costsHint}</span>
                    <span className="text-lg font-semibold tabular-nums text-[var(--ds-text)]">
                      {formatEuroCents(totalCents)}
                    </span>
                  </div>
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

                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ds-text-hint)]">
                    {text.variableLabel}
                    <CopyableCode value="{annualCost}" copyLabel={common.copy} />
                    <CopyableCode value="{monthlyCost}" copyLabel={common.copy} />
                  </p>
                </div>
              </DashboardSection.Body>
            </DashboardSection>
            {/* Its own card, because it answers a different question from the
              items above it: not what the year costs, but what it takes to be
              named for one. */}
            <DashboardSection>
              <DashboardSection.Header
                icon={<MedalIcon weight="duotone" className="size-4" />}
                title={text.minAmountTitle}
              />
              <DashboardSection.Body>
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
              </DashboardSection.Body>
            </DashboardSection>
          </div>

          <div className="grid gap-4 md:col-span-4">
            <DashboardSection>
              <DashboardSection.Header
                icon={<BankIcon weight="duotone" className="size-4" />}
                title={text.payeeTitle}
                subtitle={text.payeeHint}
              />
              <DashboardSection.Body>
                <div className="grid gap-4 md:grid-cols-2">
                  <DashboardInput
                    label={text.payeeNameLabel}
                    hint={<VariableHint name="payeeName" />}
                    value={current.payeeName}
                    onChange={(event) =>
                      updateConfig({ ...current, payeeName: event.target.value })
                    }
                  />
                  <DashboardInput
                    label={text.payeeIbanLabel}
                    hint={<VariableHint name="payeeIban" />}
                    value={current.payeeIban}
                    onChange={(event) =>
                      updateConfig({ ...current, payeeIban: event.target.value })
                    }
                  />
                  <DashboardInput
                    label={text.payeeBicLabel}
                    hint={<VariableHint name="payeeBic" before={text.payeeBicHint} />}
                    value={current.payeeBic}
                    onChange={(event) => updateConfig({ ...current, payeeBic: event.target.value })}
                  />
                </div>
              </DashboardSection.Body>
            </DashboardSection>

            {/* Its own card, because it answers a different question from the
                account above it: not where the money goes, but what is written
                on it so this project can recognise it again. */}
            <DashboardSection>
              <DashboardSection.Header
                icon={<NoteIcon weight="duotone" className="size-4" />}
                title={text.purposesTitle}
                subtitle={text.purposesHint}
              />
              <DashboardSection.Body>
                <div className="grid gap-4 md:grid-cols-2">
                  <DashboardInput
                    label={text.purposeDonationLabel}
                    hint={<VariableHint name="purposeDonation" />}
                    maxLength={MAX_REMITTANCE_UNSTRUCTURED}
                    value={current.purposeDonation}
                    onChange={(event) =>
                      updateConfig({ ...current, purposeDonation: event.target.value })
                    }
                  />
                  <DashboardInput
                    label={text.purposeSponsorLabel}
                    hint={<VariableHint name="purposeSponsor" />}
                    maxLength={MAX_REMITTANCE_UNSTRUCTURED}
                    value={current.purposeSponsor}
                    onChange={(event) =>
                      updateConfig({ ...current, purposeSponsor: event.target.value })
                    }
                  />
                  <DashboardInput
                    label={text.purposePaypalLabel}
                    hint={<VariableHint name="purposePaypal" />}
                    maxLength={MAX_REMITTANCE_UNSTRUCTURED}
                    value={current.purposePaypal}
                    onChange={(event) =>
                      updateConfig({ ...current, purposePaypal: event.target.value })
                    }
                  />
                </div>
              </DashboardSection.Body>
            </DashboardSection>
          </div>
        </div>
      </PageBody>
    </PageLayout>
  );
}
