import { MegaphoneSimpleIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useNavigate } from "react-router";

import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { CreateActionButton, SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardNumberInput } from "@/components/ui/DashboardControls.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { SupportPromptTable } from "@/features/content/support-prompts/SupportPromptTable.tsx";

import {
  useSaveSupportPromptLimits,
  useSupportPromptLimits,
  useSupportPrompts,
} from "./hooks/useSupportPrompts.ts";

/**
 * Lists the asks that appear inside the site.
 *
 * The limits sit under the table rather than on a prompt, because they bound
 * one reader across every prompt together and no single prompt may raise them.
 */
export function SupportPromptsPage() {
  const { messages } = useI18n();
  const common = messages.common;
  const text = messages.system.supportPrompts;
  const navigate = useNavigate();

  const { data: prompts, isLoading } = useSupportPrompts();
  const { data: limits } = useSupportPromptLimits();
  const saveLimits = useSaveSupportPromptLimits();
  const [draftLimits, setDraftLimits] = useState<{ maxShown: number; snoozeDays: number } | null>(
    null,
  );

  const today = new Date().toISOString().slice(0, 10);
  const currentLimits = draftLimits ?? limits ?? { maxShown: 4, snoozeDays: 14 };

  return (
    <PageLayout>
      <PageHeader title={text.title}>
        <CreateActionButton onClick={() => navigate("/support-prompts/new")} label={text.newPrompt} />
      </PageHeader>

      <PageBody className="overflow-y-auto">
        {isLoading && (
          <div className="space-y-px">
            {Array.from({ length: 5 }, (_, index) => `skeleton-${index}`).map((key) => (
              <div
                key={key}
                className="h-14 bg-[var(--ds-surface)] animate-pulse border-b border-[var(--ds-border-subtle)]"
              />
            ))}
          </div>
        )}

        {!isLoading && (prompts?.length ?? 0) === 0 && (
          <ContentUnavailableView
            icon={<MegaphoneSimpleIcon weight="duotone" aria-hidden />}
            title={text.emptyTitle}
            subtitle={text.emptyHint}
            className="flex-1 min-h-0"
          />
        )}

        {!isLoading && (prompts?.length ?? 0) > 0 && (
          <div className="-mx-3 -mt-3">
            <SupportPromptTable
              prompts={prompts ?? []}
              today={today}
              onEdit={(prompt) => navigate(`/support-prompts/${prompt.id}`)}
            />
          </div>
        )}

        <DashboardSection collapsible defaultExpanded={false} className="mt-6">
          <DashboardSection.Header
            icon={<SlidersHorizontalIcon weight="duotone" className="size-4" />}
            title={text.limitsTitle}
            subtitle={text.limitsHint}
            addOn={
              <SaveActionButton
                onClick={() => saveLimits.mutate(currentLimits, { onSuccess: () => setDraftLimits(null) })}
                disabled={draftLimits === null || saveLimits.isPending}
                busy={saveLimits.isPending}
                label={saveLimits.isPending ? common.saving : common.save}
                size="control"
              />
            }
          />
          <DashboardSection.Body>
            <div className="grid gap-4 md:grid-cols-2">
              <DashboardNumberInput
                label={text.maxShownLabel}
                value={currentLimits.maxShown}
                min={1}
                max={20}
                onChange={(event) =>
                  setDraftLimits({
                    ...currentLimits,
                    maxShown: Number(event.target.value),
                  })
                }
              />
              <DashboardNumberInput
                label={text.snoozeDaysLabel}
                value={currentLimits.snoozeDays}
                min={1}
                max={365}
                onChange={(event) =>
                  setDraftLimits({
                    ...currentLimits,
                    snoozeDays: Number(event.target.value),
                  })
                }
              />
            </div>
          </DashboardSection.Body>
        </DashboardSection>
      </PageBody>
    </PageLayout>
  );
}
