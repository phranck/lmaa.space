import { MarkdownTextarea } from "@/components/ui/MarkdownTextarea.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useEmailTemplates } from "@/features/email-templates/hooks/useEmailTemplates.ts";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SubmissionConfig, SubmissionStep, SubmissionStepEmail } from "@lmaa/contracts";
import { useEffect, useRef, useState } from "react";
import {
  SFArrowRight,
  SFCheckmark,
  SFEnvelope,
  SFPlusCircleFill,
  SFSquareAndArrowDown,
  SFStorefrontFill,
  SFTrashFill,
} from "sf-symbols-lib/monochrome";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SubmissionConfigPanelProps {
  config: SubmissionConfig | undefined;
  onChange: (config: SubmissionConfig | undefined) => void;
  /** Available form fields for dynamic recipient/replyTo selection. Same shape as FieldConfigPanel.allFields. */
  fields: { id: string; label: string }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureConfig(config: SubmissionConfig | undefined): SubmissionConfig {
  return config ?? { steps: [] };
}

// ---------------------------------------------------------------------------
// Step editor sub-components
// ---------------------------------------------------------------------------

interface StepRowProps {
  sortableId: string;
  index: number;
  step: SubmissionStep;
  onUpdate: (updated: SubmissionStep) => void;
  onRemove: () => void;
  fields: { id: string; label: string }[];
  templates: { id: number; name: string }[];
}

function StepRow({ sortableId, index, step, onUpdate, onRemove, fields, templates }: StepRowProps) {
  const { messages } = useI18n();
  const m = messages.formBuilder.submission;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const inputClass =
    "w-full px-2 py-1 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-2 px-3 py-2.5 rounded-control border border-[var(--ds-border)] bg-[var(--ds-surface)] min-w-48"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            {...attributes}
            {...listeners}
            className="shrink-0 text-[var(--ds-text-muted)] cursor-grab active:cursor-grabbing touch-none"
            aria-label={m.stepMoveAria}
          >
            ⠿
          </span>
          <span className="text-sm font-medium text-[var(--ds-text)] truncate">
            {step.type === "store"
              ? m.stepStore
              : step.type === "create-shop-suggestion"
                ? m.stepCreateShopSuggestion
                : m.stepEmail}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-[var(--ds-text-muted)] hover:text-[var(--ds-danger-text)] transition-colors"
          aria-label={m.stepRemoveAria}
        >
          <SFTrashFill className="w-3.5 h-3.5" />
        </button>
      </div>

      {step.type === "email" && (
        <>
          <div>
            <span className="block text-xs text-[var(--ds-text-muted)] mb-1">{m.emailTo}</span>
            {/* Mode toggle — reuses segmented-control pattern from FieldConfigPanel */}
            <div className="flex gap-0.5 p-0.5 mb-1.5 bg-[var(--ds-surface-alt)] rounded border border-[var(--ds-border)] w-fit">
              {(
                [
                  ["", m.emailToStatic],
                  ["field", m.emailToFromField],
                ] as const
              ).map(([val, label]) => {
                const active =
                  val === "field"
                    ? !!(step as SubmissionStepEmail).toFieldId
                    : !(step as SubmissionStepEmail).toFieldId;
                return (
                  <button
                    key={val || "static"}
                    type="button"
                    disabled={val === "field" && fields.length === 0}
                    onClick={() =>
                      onUpdate({
                        ...step,
                        toFieldId: val === "field" ? (fields[0]?.id ?? "") : undefined,
                      } as SubmissionStepEmail)
                    }
                    className={`px-2 h-6 rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      active
                        ? "bg-[var(--ds-surface)] text-[var(--ds-text)] shadow-sm"
                        : "text-[var(--ds-text-subtle)] hover:text-[var(--ds-text)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {(step as SubmissionStepEmail).toFieldId ? (
              <select
                id={`step-${index}-email-to-field`}
                value={(step as SubmissionStepEmail).toFieldId}
                onChange={(e) =>
                  onUpdate({ ...step, toFieldId: e.target.value } as SubmissionStepEmail)
                }
                className="h-9 w-full px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">—</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`step-${index}-email-to`}
                type="email"
                value={(step as SubmissionStepEmail).to}
                onChange={(e) => onUpdate({ ...step, to: e.target.value } as SubmissionStepEmail)}
                className={inputClass}
                placeholder="admin@example.com"
              />
            )}
          </div>
          <div>
            <label
              htmlFor={`step-${index}-email-template`}
              className="block text-xs text-[var(--ds-text-muted)] mb-1"
            >
              {m.emailTemplate}
            </label>
            <select
              id={`step-${index}-email-template`}
              value={(step as SubmissionStepEmail).templateId ?? ""}
              onChange={(e) =>
                onUpdate({
                  ...step,
                  templateId: e.target.value ? Number(e.target.value) : undefined,
                } as SubmissionStepEmail)
              }
              className="h-9 w-full px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">{m.emailTemplateNone}</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {!(step as SubmissionStepEmail).templateId && (
            <div>
              <label
                htmlFor={`step-${index}-email-subject`}
                className="block text-xs text-[var(--ds-text-muted)] mb-1"
              >
                {m.emailSubject}
              </label>
              <input
                id={`step-${index}-email-subject`}
                type="text"
                value={(step as SubmissionStepEmail).subject ?? ""}
                onChange={(e) =>
                  onUpdate({
                    ...step,
                    subject: e.target.value || undefined,
                  } as SubmissionStepEmail)
                }
                className={inputClass}
                placeholder={m.emailSubjectPlaceholder}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

/**
 * Panel component for configuring the submission chain of a form.
 *
 * Renders below the slug editor in {@link FormBuilderEditPage}.
 */
export function SubmissionConfigPanel({ config, onChange, fields }: SubmissionConfigPanelProps) {
  const { messages } = useI18n();
  const m = messages.formBuilder.submission;
  const { data: templates } = useEmailTemplates();

  const cfg = ensureConfig(config);

  // Stable UUIDs per step — independent of position, prevents ghost artifacts after DnD.
  const [uids, setUids] = useState<string[]>(() => cfg.steps.map(() => crypto.randomUUID()));
  const prevStepCount = useRef(cfg.steps.length);

  // Sync uid list length when steps are added/removed from outside (e.g. initial load).
  useEffect(() => {
    const prev = prevStepCount.current;
    const next = cfg.steps.length;
    if (next === prev) return;
    prevStepCount.current = next;
    setUids((ids) => {
      if (next > ids.length) {
        return [...ids, ...Array.from({ length: next - ids.length }, () => crypto.randomUUID())];
      }
      return ids.slice(0, next);
    });
  }, [cfg.steps.length]);

  function updateSteps(steps: SubmissionStep[], nextUids?: string[]) {
    if (nextUids) setUids(nextUids);
    onChange(
      steps.length === 0 && !cfg.successMessage && !cfg.successRedirectUrl
        ? undefined
        : { ...cfg, steps },
    );
  }

  function addStep(type: SubmissionStep["type"]) {
    let newStep: SubmissionStep;
    if (type === "store") newStep = { type: "store" };
    else if (type === "create-shop-suggestion") newStep = { type: "create-shop-suggestion" };
    else newStep = { type: "email", to: "" };
    updateSteps([...cfg.steps, newStep], [...uids, crypto.randomUUID()]);
  }

  function updateStep(index: number, updated: SubmissionStep) {
    const steps = cfg.steps.map((s, i) => (i === index ? updated : s));
    updateSteps(steps);
  }

  function removeStep(index: number) {
    updateSteps(
      cfg.steps.filter((_, i) => i !== index),
      uids.filter((_, i) => i !== index),
    );
  }

  function reorderSteps(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = uids.indexOf(String(active.id));
    const newIndex = uids.indexOf(String(over.id));
    if (oldIndex !== -1 && newIndex !== -1) {
      updateSteps(arrayMove(cfg.steps, oldIndex, newIndex), arrayMove(uids, oldIndex, newIndex));
    }
  }

  const [pendingStepType, setPendingStepType] = useState<SubmissionStep["type"]>("store");
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const activeStep = activeUid !== null ? (cfg.steps[uids.indexOf(activeUid)] ?? null) : null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const sortableIds = uids.slice(0, cfg.steps.length);

  function handleDragStart(event: DragStartEvent) {
    setActiveUid(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveUid(null);
    reorderSteps(event);
  }

  function updateField(
    key: "successHeadline" | "successMessage" | "successRedirectUrl",
    value: string,
  ) {
    const next = { ...cfg, [key]: value || undefined };
    if (next.steps.length === 0 && !next.successMessage && !next.successRedirectUrl) {
      onChange(undefined);
    } else {
      onChange(next);
    }
  }

  const sectionClass = "px-6 py-4 border-t border-[var(--ds-border)]";
  const labelClass = "block text-sm font-medium text-[var(--ds-text)] mb-1.5";
  const inputClass =
    "w-full px-3 py-1.5 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";

  const stepOptions = [
    { type: "store" as const, label: m.stepStore, Icon: SFSquareAndArrowDown },
    { type: "email" as const, label: m.stepEmail, Icon: SFEnvelope },
    {
      type: "create-shop-suggestion" as const,
      label: m.stepCreateShopSuggestion,
      Icon: SFStorefrontFill,
    },
  ];
  const SelectedIcon =
    stepOptions.find((o) => o.type === pendingStepType)?.Icon ?? SFSquareAndArrowDown;

  return (
    <div className={sectionClass}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-muted)]">
          {m.title}
        </h3>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 h-7 px-2 border border-[var(--ds-border)] rounded-control bg-[var(--ds-input-bg)]">
            <SelectedIcon
              width={13}
              height={13}
              className="shrink-0 text-[var(--ds-text-subtle)]"
              aria-hidden
            />
            <select
              value={pendingStepType}
              onChange={(e) => setPendingStepType(e.target.value as SubmissionStep["type"])}
              className="text-xs text-[var(--ds-text)] bg-transparent focus:outline-none cursor-pointer"
            >
              {stepOptions.map(({ type, label }) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => addStep(pendingStepType)}
            className="flex items-center gap-1.5 h-7 px-3 text-xs font-medium bg-[var(--ds-btn-primary-bg)] text-[var(--ds-btn-primary-fg)] rounded-control hover:bg-[var(--ds-btn-primary-hover)] transition-colors"
          >
            <SFPlusCircleFill className="w-3 h-3" />
            {m.addStepButton}
          </button>
        </div>
      </div>

      {/* Step chain */}
      <div className="mb-3">
        {cfg.steps.length === 0 ? (
          <p className="text-sm text-[var(--ds-text-muted)]">{m.noSteps}</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveUid(null)}
          >
            <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
              <div className="flex flex-row flex-wrap items-start gap-y-2">
                {cfg.steps.map((step, i) => (
                  <div key={uids[i]} className="flex items-start">
                    <StepRow
                      sortableId={uids[i]}
                      index={i}
                      step={step}
                      onUpdate={(updated) => updateStep(i, updated)}
                      onRemove={() => removeStep(i)}
                      fields={fields}
                      templates={templates ?? []}
                    />
                    {i < cfg.steps.length - 1 && (
                      <div className="flex items-center self-stretch px-4 text-[var(--ds-text)]">
                        <SFArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeStep && (
                <div className="flex flex-col gap-2 px-3 py-2.5 rounded-control border border-[var(--color-primary)] bg-[var(--ds-surface)] min-w-48 shadow-xl opacity-95 cursor-grabbing">
                  <span className="text-sm font-medium text-[var(--ds-text)]">
                    {activeStep.type === "store"
                      ? m.stepStore
                      : activeStep.type === "create-shop-suggestion"
                        ? m.stepCreateShopSuggestion
                        : m.stepEmail}
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Success behaviour — mutually exclusive: message or redirect */}
      <div>
        <span className={labelClass}>{m.successBehaviourLabel}</span>
        <div className="flex gap-0.5 p-0.5 mb-3 bg-[var(--ds-surface-alt)] rounded border border-[var(--ds-border)] w-fit">
          {(
            [
              ["message", m.successMessage, SFCheckmark],
              ["redirect", m.successRedirect, SFArrowRight],
            ] as const
          ).map(([mode, label, Icon]) => {
            const active =
              mode === "redirect"
                ? cfg.successRedirectUrl !== undefined
                : cfg.successRedirectUrl === undefined;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  if (mode === "redirect") {
                    const next = {
                      ...cfg,
                      successRedirectUrl: cfg.successRedirectUrl ?? "",
                      successHeadline: undefined,
                      successMessage: undefined,
                    };
                    onChange(
                      next.steps.length === 0 && !next.successRedirectUrl ? undefined : next,
                    );
                  } else {
                    const next = {
                      ...cfg,
                      successMessage: cfg.successMessage ?? "",
                      successRedirectUrl: undefined,
                    };
                    onChange(next.steps.length === 0 && !next.successMessage ? undefined : next);
                  }
                }}
                className={`inline-flex items-center gap-1 px-2 h-6 rounded text-xs font-medium transition-colors ${
                  active
                    ? "bg-[var(--ds-surface)] text-[var(--ds-text)] shadow-sm"
                    : "text-[var(--ds-text-subtle)] hover:text-[var(--ds-text)]"
                }`}
              >
                <Icon width={13} height={13} aria-hidden />
                {label}
              </button>
            );
          })}
        </div>

        {cfg.successRedirectUrl !== undefined ? (
          <input
            id="submission-success-redirect"
            type="url"
            value={cfg.successRedirectUrl}
            onChange={(e) => updateField("successRedirectUrl", e.target.value)}
            className={inputClass}
            placeholder="https://example.com/danke"
          />
        ) : (
          <div className="flex flex-col gap-2">
            <div>
              <label
                htmlFor="submission-success-headline"
                className="block text-xs text-[var(--ds-text-muted)] mb-1"
              >
                {m.successHeadline}
              </label>
              <input
                id="submission-success-headline"
                type="text"
                value={cfg.successHeadline ?? ""}
                onChange={(e) => updateField("successHeadline", e.target.value)}
                className={inputClass}
                placeholder={m.successHeadlinePlaceholder}
              />
            </div>
            <div>
              <label
                htmlFor="submission-success-message"
                className="block text-xs text-[var(--ds-text-muted)] mb-1"
              >
                Text
              </label>
              <MarkdownTextarea
                id="submission-success-message"
                value={cfg.successMessage ?? ""}
                onChange={(value) => updateField("successMessage", value)}
                placeholder={m.successMessagePlaceholder}
                rows={4}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
