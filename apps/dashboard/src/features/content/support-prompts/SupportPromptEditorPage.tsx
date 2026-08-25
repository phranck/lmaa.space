import { CalendarBlankIcon, MegaphoneSimpleIcon, TextAaIcon } from "@phosphor-icons/react";
import { lazy, Suspense, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import {
  SUPPORT_PROMPT_KINDS,
  SUPPORT_PROMPT_SLOTS,
  type SupportPrompt,
  type SupportPromptInput,
  type SupportPromptKind,
  type SupportPromptSlot,
} from "@lmaa/contracts";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { DeleteActionButton, SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import {
  DashboardCombobox,
  DashboardInput,
  DashboardNumberInput,
  DashboardSwitchField,
} from "@/components/ui/DashboardControls.tsx";
import { DateTimePicker } from "@/components/ui/DateTimePicker.tsx";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog.tsx";
import { EditorPageShell } from "@/components/ui/EditorPageShell.tsx";
import { SaveNotification, useSaveNotification } from "@/components/ui/SaveNotification.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useContentPages } from "@/features/content/hooks/useAdminContent.ts";
import { SupportPromptKindGraphic } from "@/features/content/support-prompts/SupportPromptKindGraphic.tsx";

import {
  useCreateSupportPrompt,
  useDeleteSupportPrompt,
  useSaveSupportPrompt,
  useSupportPrompts,
} from "./hooks/useSupportPrompts.ts";

const MarkdownEditor = lazy(() =>
  import("@lmaa/ui/markdown-editor").then((module) => ({ default: module.MarkdownEditor })),
);

/** The fields a new prompt starts with. */
function emptyPrompt(name: string): SupportPromptInput {
  return {
    name,
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
  };
}

/** Turns a stored prompt back into the fields an editor works on. */
function toInput(prompt: SupportPrompt): SupportPromptInput {
  const { id: _id, updatedAt: _updatedAt, ...fields } = prompt;
  return fields;
}

/**
 * The form for one prompt, grouped by subject.
 *
 * Where it appears, what it says, and when it runs are three different
 * questions, so they are three sections rather than one long column of fields.
 */
export function SupportPromptEditorPage() {
  const { messages } = useI18n();
  const common = messages.common;
  const text = messages.system.supportPrompts;
  const navigate = useNavigate();
  const { promptId } = useParams<{ promptId: string }>();
  const isNew = promptId === "new";

  const { data: prompts } = useSupportPrompts();
  const create = useCreateSupportPrompt();
  const save = useSaveSupportPrompt();
  const remove = useDeleteSupportPrompt();

  const stored = prompts?.find((prompt) => prompt.id === promptId) ?? null;
  const [draft, setDraft] = useState<SupportPromptInput | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { phase: savedPhase, show: showSaved } = useSaveNotification();

  const fields = draft ?? (isNew ? emptyPrompt(text.newPrompt) : stored ? toInput(stored) : null);

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

  // The picture carries the meaning here, so each option is a tile: the shape
  // above, its name below. The closed control shows the name alone.
  const kindOptions = useMemo(
    () =>
      SUPPORT_PROMPT_KINDS.map((kind) => {
        const label = kind === "card" ? text.kinds.card : text.kinds.line;
        return {
          value: kind,
          triggerLabel: label,
          label: (
            <span className="flex flex-col items-center gap-2 py-1">
              <SupportPromptKindGraphic kind={kind} width={88} />
              <span className="text-sm">{label}</span>
            </span>
          ),
        };
      }),
    [text],
  );

  // Where the button leads is a page of this site, so it is chosen rather than
  // typed. A mistyped path is a dead button that nobody notices.
  const { data: pages } = useContentPages();
  const pageOptions = useMemo(
    () =>
      (pages ?? [])
        .filter((page) => page.status === "published")
        .map((page) => ({ value: `/${page.slug}`, label: `${page.title} · /${page.slug}` })),
    [pages],
  );

  function update(patch: Partial<SupportPromptInput>) {
    if (!fields) return;
    setDraft({ ...fields, ...patch });
  }

  function handleSave() {
    if (!fields) return;
    if (isNew) {
      create.mutate(fields, {
        onSuccess: (prompt) => {
          setDraft(null);
          navigate(`/support-prompts/${prompt.id}`, { replace: true });
        },
      });
      return;
    }
    if (!promptId) return;
    save.mutate(
      { id: promptId, input: fields },
      {
        onSuccess: () => {
          setDraft(null);
          showSaved();
        },
      },
    );
  }

  const isPending = create.isPending || save.isPending || remove.isPending;

  return (
    <>
      <EditorPageShell
        title={fields?.name ?? text.title}
        backLabel={text.title}
        onBack={() => navigate("/support-prompts")}
        noCard
        headerContent={
          <div className="flex items-center gap-3">
            <SaveNotification phase={savedPhase} label={common.saved} />
            {!isNew && (
              <DeleteActionButton
                onClick={() => setConfirmDelete(true)}
                disabled={isPending}
                label={common.delete}
              />
            )}
            <SaveActionButton
              onClick={handleSave}
              disabled={!fields || isPending}
              busy={isPending}
              label={isPending ? common.saving : common.save}
              size="control"
            />
          </div>
        }
      >
        {fields && (
          <div className="space-y-4">
            <DashboardSection>
              <DashboardSection.Header
                icon={<MegaphoneSimpleIcon weight="duotone" className="size-4" />}
                title={text.placementTitle}
                subtitle={text.placementHint}
              />
              <DashboardSection.Body>
                <div className="grid gap-4 md:grid-cols-2">
                  <DashboardInput
                    label={text.nameLabel}
                    placeholder={text.namePlaceholder}
                    value={fields.name}
                    onChange={(event) => update({ name: event.target.value })}
                  />
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
                    optionsLayout="row"
                    matchTriggerWidth={false}
                    onValueChange={(value) => update({ kind: value as SupportPromptKind })}
                  />
                  <DashboardNumberInput
                    label={text.thresholdLabel}
                    hint={text.thresholdHint}
                    value={fields.threshold}
                    min={0}
                    max={500}
                    onChange={(event) => update({ threshold: Number(event.target.value) })}
                  />
                  <DashboardNumberInput
                    label={text.priorityLabel}
                    hint={text.priorityHint}
                    value={fields.priority}
                    min={0}
                    max={1000}
                    onChange={(event) => update({ priority: Number(event.target.value) })}
                  />
                </div>
              </DashboardSection.Body>
            </DashboardSection>

            <DashboardSection>
              <DashboardSection.Header
                icon={<TextAaIcon weight="duotone" className="size-4" />}
                title={text.contentLabel}
                subtitle={text.contentHint}
              />
              <DashboardSection.Body>
                <div className="grid gap-4 md:grid-cols-2">
                  <DashboardInput
                    label={text.buttonLabel}
                    value={fields.buttonLabel}
                    onChange={(event) => update({ buttonLabel: event.target.value })}
                  />
                  <DashboardCombobox
                    label={text.buttonHrefLabel}
                    value={fields.buttonHref}
                    options={pageOptions}
                    searchable
                    onValueChange={(value) => update({ buttonHref: value })}
                  />
                  <DashboardInput
                    label={text.dismissLabel}
                    hint={text.dismissHint}
                    value={fields.dismissLabel}
                    onChange={(event) => update({ dismissLabel: event.target.value })}
                  />
                </div>
                <div className="mt-4">
                  <Suspense
                    fallback={<div className="h-64 animate-pulse bg-[var(--ds-input-bg)]" />}
                  >
                    <MarkdownEditor
                      key={promptId}
                      value={fields.content}
                      onChange={(value) => update({ content: value })}
                      height="24rem"
                    />
                  </Suspense>
                </div>
              </DashboardSection.Body>
            </DashboardSection>

            <DashboardSection>
              <DashboardSection.Header
                icon={<CalendarBlankIcon weight="duotone" className="size-4" />}
                title={text.scheduleTitle}
                subtitle={text.windowHint}
                addOn={
                  <DashboardSwitchField
                    label={text.publishedLabel}
                    checked={fields.published}
                    onCheckedChange={(checked) => update({ published: checked })}
                  />
                }
              />
              <DashboardSection.Body>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-subtle)]">
                      {text.startsAtLabel}
                    </span>
                    <DateTimePicker
                      mode="date"
                      value={fields.startsAt ?? ""}
                      onChange={(value) => update({ startsAt: value || null })}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-subtle)]">
                      {text.endsAtLabel}
                    </span>
                    <DateTimePicker
                      mode="date"
                      value={fields.endsAt ?? ""}
                      onChange={(value) => update({ endsAt: value || null })}
                    />
                  </label>
                </div>
              </DashboardSection.Body>
            </DashboardSection>
          </div>
        )}
      </EditorPageShell>

      <DeleteConfirmDialog
        open={confirmDelete}
        title={text.deleteTitle}
        description={text.deleteMessage}
        cancelLabel={common.cancel}
        deleteLabel={common.delete}
        isPending={remove.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (!promptId) return;
          remove.mutate(promptId, { onSuccess: () => navigate("/support-prompts") });
        }}
      />
    </>
  );
}
