import { lazy, Suspense, useMemo, useState } from "react";

import {
  SUPPORT_PROMPT_KINDS,
  SUPPORT_PROMPT_SLOTS,
  type SupportPrompt,
  type SupportPromptInput,
  type SupportPromptKind,
  type SupportPromptSlot,
} from "@lmaa/contracts";

import { Badge } from "@/components/ui/Badge.tsx";
import { Card } from "@/components/ui/Card.tsx";
import {
  CreateActionButton,
  DeleteActionButton,
  SaveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import {
  DashboardCombobox,
  DashboardInput,
  DashboardNumberInput,
  DashboardSwitchField,
} from "@/components/ui/DashboardControls.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import {
  PageBody,
  PageLayout,
  PageSplitAside,
  PageSplitLayout,
  PageSplitMain,
} from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

import {
  useCreateSupportPrompt,
  useDeleteSupportPrompt,
  useSaveSupportPrompt,
  useSaveSupportPromptLimits,
  useSupportPromptLimits,
  useSupportPrompts,
} from "./hooks/useSupportPrompts.ts";

const MarkdownEditor = lazy(() =>
  import("@lmaa/ui/markdown-editor").then((module) => ({ default: module.MarkdownEditor })),
);

/** A prompt's state, as a reader would experience it today. */
type PromptState = "draft" | "scheduled" | "live" | "expired";

/**
 * Works out what a prompt does today.
 *
 * The window is compared by day rather than by moment, so a prompt that names
 * its last day is still shown on that day.
 *
 * @param prompt - The prompt to judge.
 * @param today - The current day as `YYYY-MM-DD`.
 * @returns Whether it is a draft, waiting, running, or over.
 */
export function promptState(prompt: SupportPrompt, today: string): PromptState {
  if (!prompt.published) return "draft";
  if (prompt.startsAt && today < prompt.startsAt) return "scheduled";
  if (prompt.endsAt && today > prompt.endsAt) return "expired";
  return "live";
}

/** Turns a stored prompt back into the fields an editor works on. */
function toInput(prompt: SupportPrompt): SupportPromptInput {
  return {
    name: prompt.name,
    slot: prompt.slot,
    kind: prompt.kind,
    content: prompt.content,
    buttonLabel: prompt.buttonLabel,
    buttonHref: prompt.buttonHref,
    dismissLabel: prompt.dismissLabel,
    threshold: prompt.threshold,
    startsAt: prompt.startsAt,
    endsAt: prompt.endsAt,
    priority: prompt.priority,
    published: prompt.published,
  };
}

export function SupportPromptsPage() {
  const { messages } = useI18n();
  const common = messages.common;
  const text = messages.system.supportPrompts;

  const { data: prompts, isLoading } = useSupportPrompts();
  const { data: limits } = useSupportPromptLimits();
  const create = useCreateSupportPrompt();
  const save = useSaveSupportPrompt();
  const remove = useDeleteSupportPrompt();
  const saveLimits = useSaveSupportPromptLimits();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SupportPromptInput | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const selected = useMemo(
    () => prompts?.find((prompt) => prompt.id === selectedId) ?? null,
    [prompts, selectedId],
  );
  const fields = draft ?? (selected ? toInput(selected) : null);

  const slotOptions = useMemo(
    () =>
      SUPPORT_PROMPT_SLOTS.map((slot) => ({
        value: slot,
        label:
          slot === "my-shops"
            ? text.slots.myShops
            : slot === "shop-detail"
              ? text.slots.shopDetail
              : text.slots.categoryGrid,
      })),
    [text],
  );

  const kindOptions = useMemo(
    () =>
      SUPPORT_PROMPT_KINDS.map((kind) => ({
        value: kind,
        label: kind === "card" ? text.kinds.card : text.kinds.line,
      })),
    [text],
  );

  const stateLabels: Record<PromptState, string> = {
    draft: text.draft,
    scheduled: text.scheduled,
    live: text.live,
    expired: text.expired,
  };

  function update(patch: Partial<SupportPromptInput>) {
    if (!fields) return;
    setDraft({ ...fields, ...patch });
  }

  function handleCreate() {
    create.mutate(
      {
        name: text.newPrompt,
        slot: "my-shops",
        kind: "card",
        content: "",
        buttonLabel: "",
        buttonHref: "/support-me",
        dismissLabel: "",
        threshold: 3,
        startsAt: null,
        endsAt: null,
        priority: 0,
        published: false,
      },
      {
        onSuccess: (prompt) => {
          setSelectedId(prompt.id);
          setDraft(toInput(prompt));
        },
      },
    );
  }

  function handleSave() {
    if (!selected || !fields) return;
    save.mutate({ id: selected.id, input: fields }, { onSuccess: () => setDraft(null) });
  }

  function handleDelete() {
    if (!selected) return;
    if (!window.confirm(text.deleteConfirm)) return;
    remove.mutate(selected.id, {
      onSuccess: () => {
        setSelectedId(null);
        setDraft(null);
      },
    });
  }

  return (
    <PageLayout>
      <PageHeader title={text.title}>
        <SaveActionButton
          onClick={handleSave}
          disabled={!selected || !draft || save.isPending}
          busy={save.isPending}
          label={save.isPending ? common.saving : common.save}
          size="control"
        />
      </PageHeader>

      <PageBody>
        <PageSplitLayout columnsClassName="xl:grid-cols-[26rem_minmax(0,1fr)]">
          <PageSplitAside>
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--ds-text)]">{text.listTitle}</h2>
                  <p className="text-xs text-[var(--ds-text-muted)]">{text.listHint}</p>
                </div>
                <CreateActionButton
                  onClick={handleCreate}
                  busy={create.isPending}
                  label={text.newPrompt}
                  size="control"
                />
              </div>

              {isLoading && <p className="text-xs text-[var(--ds-text-muted)]">{common.loading}</p>}

              {!isLoading && (prompts?.length ?? 0) === 0 && (
                <p className="text-xs text-[var(--ds-text-muted)]">{text.empty}</p>
              )}

              <ul className="m-0 list-none space-y-2 p-0">
                {prompts?.map((prompt) => {
                  const state = promptState(prompt, today);
                  const active = prompt.id === selectedId;
                  return (
                    <li key={prompt.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(prompt.id);
                          setDraft(null);
                        }}
                        className="flex w-full flex-col gap-1 rounded-control border p-3 text-left"
                        style={{
                          borderColor: active ? "var(--ds-accent)" : "var(--ds-border-subtle)",
                          background: active ? "var(--ds-accent-tint)" : "transparent",
                        }}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{prompt.name}</span>
                          <Badge
                            colorClass={
                              state === "live"
                                ? "bg-[var(--ds-success-bg)] text-[var(--ds-success-text)]"
                                : "bg-[var(--ds-surface-inset)] text-[var(--ds-text-muted)]"
                            }
                          >
                            {stateLabels[state]}
                          </Badge>
                        </span>
                        <span className="text-xs text-[var(--ds-text-muted)]">
                          {slotOptions.find((option) => option.value === prompt.slot)?.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card className="mt-4 p-4 space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--ds-text)]">{text.limitsTitle}</h2>
                <p className="text-xs text-[var(--ds-text-muted)]">{text.limitsHint}</p>
              </div>
              <DashboardNumberInput
                label={text.maxShownLabel}
                value={limits?.maxShown ?? 4}
                min={1}
                max={20}
                onChange={(event) =>
                  saveLimits.mutate({
                    maxShown: Number(event.currentTarget.value),
                    snoozeDays: limits?.snoozeDays ?? 14,
                  })
                }
              />
              <DashboardNumberInput
                label={text.snoozeDaysLabel}
                value={limits?.snoozeDays ?? 14}
                min={1}
                max={365}
                onChange={(event) =>
                  saveLimits.mutate({
                    maxShown: limits?.maxShown ?? 4,
                    snoozeDays: Number(event.currentTarget.value),
                  })
                }
              />
            </Card>
          </PageSplitAside>

          <PageSplitMain>
            {!fields && (
              <Card className="p-6">
                <p className="text-sm text-[var(--ds-text-muted)]">{text.empty}</p>
              </Card>
            )}

            {fields && selected && (
              <Card className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <DashboardInput
                    label={text.nameLabel}
                    placeholder={text.namePlaceholder}
                    value={fields.name}
                    onChange={(event) => update({ name: event.currentTarget.value })}
                    fieldClassName="flex-1"
                  />
                  <DeleteActionButton onClick={handleDelete} busy={remove.isPending} size="control" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <DashboardCombobox
                    label={text.slotLabel}
                    value={fields.slot}
                    options={slotOptions}
                    onValueChange={(value) => update({ slot: value as SupportPromptSlot })}
                  />
                  <DashboardCombobox
                    label={text.kindLabel}
                    value={fields.kind}
                    options={kindOptions}
                    onValueChange={(value) => update({ kind: value as SupportPromptKind })}
                  />
                  <DashboardInput
                    label={text.buttonLabel}
                    value={fields.buttonLabel}
                    onChange={(event) => update({ buttonLabel: event.currentTarget.value })}
                  />
                  <DashboardInput
                    label={text.buttonHrefLabel}
                    value={fields.buttonHref}
                    onChange={(event) => update({ buttonHref: event.currentTarget.value })}
                  />
                  <DashboardInput
                    label={text.dismissLabel}
                    hint={text.dismissHint}
                    value={fields.dismissLabel}
                    onChange={(event) => update({ dismissLabel: event.currentTarget.value })}
                  />
                  <DashboardNumberInput
                    label={text.thresholdLabel}
                    hint={text.thresholdHint}
                    value={fields.threshold}
                    min={0}
                    max={500}
                    onChange={(event) => update({ threshold: Number(event.currentTarget.value) })}
                  />
                  <DashboardInput
                    label={text.startsAtLabel}
                    hint={text.windowHint}
                    type="date"
                    value={fields.startsAt ?? ""}
                    onChange={(event) => update({ startsAt: event.currentTarget.value || null })}
                  />
                  <DashboardInput
                    label={text.endsAtLabel}
                    type="date"
                    value={fields.endsAt ?? ""}
                    onChange={(event) => update({ endsAt: event.currentTarget.value || null })}
                  />
                  <DashboardNumberInput
                    label={text.priorityLabel}
                    hint={text.priorityHint}
                    value={fields.priority}
                    min={0}
                    max={1000}
                    onChange={(event) => update({ priority: Number(event.currentTarget.value) })}
                  />
                  <DashboardSwitchField
                    label={text.publishedLabel}
                    description={text.publishedHint}
                    checked={fields.published}
                    onCheckedChange={(checked) => update({ published: checked })}
                  />
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-1">
                  <span className="text-sm text-[var(--ds-text)]">{text.contentLabel}</span>
                  <span className="text-xs text-[var(--ds-text-muted)]">{text.contentHint}</span>
                  <div className="min-h-0 flex-1">
                    <Suspense
                      fallback={<div className="h-64 animate-pulse bg-[var(--ds-input-bg)]" />}
                    >
                      <MarkdownEditor
                        key={selected.id}
                        value={fields.content}
                        onChange={(value) => update({ content: value })}
                        height="100%"
                      />
                    </Suspense>
                  </div>
                </div>
              </Card>
            )}
          </PageSplitMain>
        </PageSplitLayout>
      </PageBody>
    </PageLayout>
  );
}
