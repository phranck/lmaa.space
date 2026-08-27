import { CalendarBlankIcon, MegaphoneSimpleIcon, TextAaIcon } from "@phosphor-icons/react";
import { lazy, Suspense, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import {
  SUPPORT_PROMPT_BUTTON_ALIGNMENTS,
  SUPPORT_PROMPT_SLOTS,
  SUPPORT_PROMPT_THRESHOLD_BASES,
  type SupportPrompt,
  type SupportPromptButtonAlignment,
  type SupportPromptInput,
  type SupportPromptSlot,
  type SupportPromptThresholdBasis,
} from "@lmaa/contracts";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

/**
 * The editor's DOM id, which is how its height is remembered.
 *
 * `usePersistedTextareaHeight` finds the element by this id and waits for it,
 * which matters here because the editor is loaded lazily and its fallback is
 * a different node.
 */
const PROMPT_EDITOR_ID = "support-prompt-content";

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
import { usePersistedTextareaHeight } from "@/lib/hooks/usePersistedTextareaHeight.ts";

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
    content: "",
    buttonLabel: "",
    buttonHref: "/support-me",
    buttonAlignment: "trailing",
    threshold: 3,
    thresholdBasis: "viewed",
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

  // Remembers how tall the editor was dragged, the same way six other fields
  // in the dashboard already do.
  usePersistedTextareaHeight(PROMPT_EDITOR_ID, "support-prompts:editor:content");

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

  const thresholdBasisOptions = useMemo(
    () =>
      SUPPORT_PROMPT_THRESHOLD_BASES.map((basis) => ({
        value: basis,
        label: text.thresholdBases[basis],
      })),
    [text],
  );

  const buttonAlignmentOptions = useMemo(
    () =>
      SUPPORT_PROMPT_BUTTON_ALIGNMENTS.map((alignment) => ({
        value: alignment,
        label: text.buttonAlignments[alignment],
      })),
    [text],
  );

  // Where the button leads is a page of this site, so it is chosen rather than
  // typed. A mistyped path is a dead button that nobody notices.
  const { data: pages } = useContentPages();
  const pageOptions = useMemo(
    () =>
      (pages ?? []).flatMap((page) =>
        page.status === "published"
          ? [{ value: `/${page.slug}`, label: `${page.title} · /${page.slug}` }]
          : [],
      ),
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
                  {/* The number and what it counts are one question, so they
                      share a row. The counter takes only the width of its own
                      words. */}
                  <div className="flex items-start gap-3">
                    <DashboardNumberInput
                      label={text.thresholdLabel}
                      hint={text.thresholdHint}
                      fieldClassName="flex-1 min-w-0"
                      value={fields.threshold}
                      min={0}
                      max={500}
                      onChange={(event) => update({ threshold: Number(event.target.value) })}
                    />
                    <DashboardCombobox
                      label={text.thresholdBasisLabel}
                      value={fields.thresholdBasis}
                      options={thresholdBasisOptions}
                      minWidthFromOptions
                      fieldClassName="shrink-0"
                      onValueChange={(value) =>
                        update({ thresholdBasis: value as SupportPromptThresholdBasis })
                      }
                    />
                  </div>
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
                  {/* The caption and where it stands are two answers about the
                      same button, so they share a row. The position takes only
                      the width of its own words, because a control as wide as a
                      text field promises more to type than three choices. */}
                  <div className="flex items-start gap-3">
                    <DashboardInput
                      label={text.buttonLabel}
                      fieldClassName="flex-1 min-w-0"
                      value={fields.buttonLabel}
                      onChange={(event) => update({ buttonLabel: event.target.value })}
                    />
                    <DashboardCombobox
                      label={text.buttonAlignmentLabel}
                      value={fields.buttonAlignment}
                      options={buttonAlignmentOptions}
                      minWidthFromOptions
                      fieldClassName="shrink-0"
                      onValueChange={(value) =>
                        update({ buttonAlignment: value as SupportPromptButtonAlignment })
                      }
                    />
                  </div>
                  <DashboardCombobox
                    label={text.buttonHrefLabel}
                    value={fields.buttonHref}
                    options={pageOptions}
                    searchable
                    onValueChange={(value) => update({ buttonHref: value })}
                  />
                </div>
                <div className="mt-4">
                  <Suspense
                    fallback={<div className="h-64 animate-pulse bg-[var(--ds-input-bg)]" />}
                  >
                    <MarkdownEditor
                      key={promptId}
                      value={fields.content}
                      id={PROMPT_EDITOR_ID}
                      onChange={(value) => update({ content: value })}
                      height="24rem"
                      resizable
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
                      clearable
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
                      clearable
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
