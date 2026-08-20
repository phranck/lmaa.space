import { CurrencyDollarIcon, EnvelopeIcon, RobotIcon } from "@phosphor-icons/react";
import { memo, useCallback, useMemo, useState } from "react";

import {
  REVIEW_EFFORT_LEVELS,
  REVIEW_SETTING_DEFAULTS,
  resolveEffortLevel,
  SETTINGS_KEYS,
} from "@lmaa/shared";
import type { ReviewEffortLevel } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";
import { fieldHelpClass, fieldLabelClass } from "@lmaa/ui/field-primitives";
import { ToggleSwitch } from "@lmaa/ui/toggle-switch";

import { SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import {
  DashboardCombobox,
  DashboardNumberInput,
  DashboardSegmentedControl,
} from "@/components/ui/DashboardControls.tsx";
import { PageFooter } from "@/components/ui/PageFooter.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useEmailTemplates } from "@/features/templates/hooks/useEmailTemplates.ts";

import {
  useReviewModels,
  useSaveSystemSetting,
  useSystemSettings,
} from "./hooks/useSystemSettings.ts";

const EDITED_KEYS = [
  SETTINGS_KEYS.REVIEW_MODE,
  SETTINGS_KEYS.REVIEW_AUTO_APPLY_ACCEPT,
  SETTINGS_KEYS.REVIEW_AUTO_APPLY_REJECT,
  SETTINGS_KEYS.REVIEW_MODEL,
  SETTINGS_KEYS.REVIEW_EFFORT,
  SETTINGS_KEYS.REVIEW_MAX_ATTEMPTS,
  SETTINGS_KEYS.REVIEW_COST_LIMIT_PER_CHECK_EUR,
  SETTINGS_KEYS.REVIEW_COST_LIMIT_PER_DAY_EUR,
  SETTINGS_KEYS.REVIEW_REPORT_ENABLED,
  SETTINGS_KEYS.REVIEW_REPORT_TEMPLATE_ID,
  SETTINGS_KEYS.REVIEW_NOTIFY_ACCEPT_TEMPLATE_ID,
  SETTINGS_KEYS.REVIEW_NOTIFY_REJECT_TEMPLATE_ID,
] as const;

/** The settings this tab edits, as the strings they are stored as. */
type ReviewDraft = Record<(typeof EDITED_KEYS)[number], string>;

const rowLabelClass = "text-sm font-medium text-[var(--ds-text)]";
const introClass = "mb-1 text-sm text-[var(--ds-text-muted)]";

function readStored(stored: Record<string, string> | undefined): ReviewDraft {
  const draft = {} as ReviewDraft;
  for (const key of EDITED_KEYS) {
    draft[key] = stored?.[key] ?? REVIEW_SETTING_DEFAULTS[key];
  }
  return draft;
}

function isEqual(left: ReviewDraft, right: ReviewDraft): boolean {
  return EDITED_KEYS.every((key) => left[key] === right[key]);
}

/**
 * Edits the automated review's runtime configuration.
 *
 * @remarks
 * Every value here is a system setting rather than an environment variable, so
 * a change applies on the worker's next run instead of on the next deployment.
 * The provider key is the one thing that stays in the environment, because it
 * is a secret and a settings table is not a place for one.
 *
 * The model is chosen from the list the provider currently offers rather than
 * typed, because a mistyped identifier is only discovered when a check fails,
 * and a list written into the code would be wrong the day a model is released.
 */
export const ReviewTab = memo(function ReviewTab({ active }: { active: boolean }) {
  const { messages } = useI18n();
  const common = messages.common;
  const t = messages.system.settings.review;

  const { data: stored } = useSystemSettings();
  const { data: templates, isLoading: templatesLoading } = useEmailTemplates();
  const { data: models, isLoading: modelsLoading } = useReviewModels();
  const saveSetting = useSaveSystemSetting();

  const baseline = useMemo(() => readStored(stored), [stored]);
  const [draft, setDraft] = useState<ReviewDraft>(baseline);
  const [savedBaseline, setSavedBaseline] = useState<ReviewDraft>(baseline);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // A reload that brings different values wins over an untouched draft, which
  // is how the form picks up a change made in another tab or session.
  if (!isEqual(baseline, savedBaseline)) {
    setSavedBaseline(baseline);
    setDraft(baseline);
  }

  const dirty = !isEqual(draft, savedBaseline);
  const assistMode = draft[SETTINGS_KEYS.REVIEW_MODE] === "assist";
  const templateChosen = draft[SETTINGS_KEYS.REVIEW_REPORT_TEMPLATE_ID] !== "";
  const reportEnabled = draft[SETTINGS_KEYS.REVIEW_REPORT_ENABLED] === "true";
  const selectedModel = draft[SETTINGS_KEYS.REVIEW_MODEL];
  // One explanation per mode rather than both at once: the reader has already
  // chosen, and the other one only competes for attention.
  const modeHint = assistMode ? t.modeHintAssist : t.modeHintOff;

  const templateOptions = useMemo(
    () => [
      { value: "", label: messages.system.settings.newShopSubmission.templatePlaceholder },
      ...(templates?.map((template) => ({
        value: String(template.id),
        label: template.name,
      })) ?? []),
    ],
    [messages, templates],
  );

  const set = useCallback((key: (typeof EDITED_KEYS)[number], value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  // Only the levels the chosen model accepts. A request carrying another one is
  // refused with a 400 before anything is researched, so offering it at all
  // would be offering a run that cannot start. A model that is not in the list
  // keeps every level, because nothing is known about it either way.
  const acceptedEfforts = useMemo(() => {
    const known = (models ?? []).find((model) => model.id === selectedModel);
    return known ? known.efforts : [...REVIEW_EFFORT_LEVELS];
  }, [models, selectedModel]);
  const effortOptions = useMemo(
    () => acceptedEfforts.map((level) => ({ value: level, label: level })),
    [acceptedEfforts],
  );

  // Changing the model can drop the chosen level. The level a run would use is
  // derived here with the same rule the worker applies, rather than written
  // back into the draft, so the field always shows what will actually run.
  const effectiveEffort =
    resolveEffortLevel(acceptedEfforts, draft[SETTINGS_KEYS.REVIEW_EFFORT] as ReviewEffortLevel) ??
    draft[SETTINGS_KEYS.REVIEW_EFFORT];

  // The configured model stays selectable even when the list could not be
  // fetched, so a provider outage never silently rewrites the setting.
  const modelOptions = useMemo(() => {
    const options = (models ?? []).map((model) => ({
      value: model.id,
      label: model.displayName,
    }));
    if (selectedModel && !options.some((option) => option.value === selectedModel)) {
      options.unshift({ value: selectedModel, label: selectedModel });
    }
    return options;
  }, [models, selectedModel]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      // What is saved is what the field shows, so a level the chosen model does
      // not accept is never written back.
      const pending = { ...draft, [SETTINGS_KEYS.REVIEW_EFFORT]: effectiveEffort };
      await Promise.all(
        EDITED_KEYS.flatMap((key) =>
          pending[key] === savedBaseline[key]
            ? []
            : [saveSetting.mutateAsync({ key, value: pending[key] })],
        ),
      );
      setSavedBaseline(pending);
      setSaveError(null);
    } catch {
      setSaveError(t.saveError);
    } finally {
      setSaving(false);
    }
  }, [draft, effectiveEffort, savedBaseline, saveSetting, t.saveError]);

  return (
    <div className="flex max-w-7xl flex-col gap-6">
      {/* Two columns that pack rather than a row grid: the cards differ a lot
          in height, and a grid leaves the space under a short card empty until
          the tallest card of its row ends. The spacing is padding rather than a
          margin, because a margin at a column break is dropped and the next
          column would then start lower than the first. */}
      <div className="columns-1 gap-6 md:columns-2">
        <div className="break-inside-avoid pb-6">
          <DashboardSection>
            <DashboardSection.Header
              icon={<RobotIcon weight="duotone" className="size-4" />}
              title={t.title}
            />
            <DashboardSection.Body className="flex flex-col gap-3">
              <p className={introClass}>{t.subtitle}</p>

              {/* A segmented control rather than a list: two mutually exclusive
                stages that are read against each other, and both fit. */}
              <div className="space-y-1">
                <p className={fieldLabelClass}>{t.modeLabel}</p>
                <DashboardSegmentedControl
                  aria-label={t.modeLabel}
                  value={draft[SETTINGS_KEYS.REVIEW_MODE]}
                  onValueChange={(value) => set(SETTINGS_KEYS.REVIEW_MODE, value)}
                  options={[
                    { value: "off", label: t.modeOff },
                    { value: "assist", label: t.modeAssist },
                  ]}
                />
                <p className={fieldHelpClass}>{modeHint}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DashboardCombobox
                  id="review-model"
                  fullWidth
                  searchable
                  label={t.modelLabel}
                  hint={modelsLoading ? t.modelLoading : t.modelHint}
                  disabled={saving || modelsLoading}
                  value={selectedModel}
                  onValueChange={(value) => set(SETTINGS_KEYS.REVIEW_MODEL, value)}
                  options={modelOptions}
                />

                <DashboardCombobox
                  id="review-effort"
                  fullWidth
                  label={t.effortLabel}
                  hint={acceptedEfforts.length === 0 ? t.effortUnsupported : t.effortHint}
                  disabled={saving || acceptedEfforts.length === 0}
                  value={effectiveEffort}
                  onValueChange={(value) => set(SETTINGS_KEYS.REVIEW_EFFORT, value)}
                  options={effortOptions}
                />
              </div>

              <DashboardNumberInput
                id="review-attempts"
                fullWidth
                label={t.maxAttemptsLabel}
                hint={t.maxAttemptsHint}
                min={1}
                max={10}
                disabled={saving}
                value={draft[SETTINGS_KEYS.REVIEW_MAX_ATTEMPTS]}
                onChange={(event) => set(SETTINGS_KEYS.REVIEW_MAX_ATTEMPTS, event.target.value)}
              />
            </DashboardSection.Body>
          </DashboardSection>
        </div>

        {/* Only rendered in assist mode, because that is the only mode it affects. */}
        {assistMode ? (
          <div className="break-inside-avoid pb-6">
            <DashboardSection>
              <DashboardSection.Header
                icon={<RobotIcon weight="duotone" className="size-4" />}
                title={t.autoApplyTitle}
              />
              <DashboardSection.Body className="flex flex-col gap-3">
                <p className={introClass}>{t.autoApplyHint}</p>
                <div className="flex items-center justify-between gap-4">
                  <span className={rowLabelClass}>{t.autoApplyAccept}</span>
                  <ToggleSwitch
                    checked={draft[SETTINGS_KEYS.REVIEW_AUTO_APPLY_ACCEPT] === "true"}
                    disabled={saving}
                    onChange={(next) =>
                      set(SETTINGS_KEYS.REVIEW_AUTO_APPLY_ACCEPT, next ? "true" : "false")
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className={rowLabelClass}>{t.autoApplyReject}</span>
                  <ToggleSwitch
                    checked={draft[SETTINGS_KEYS.REVIEW_AUTO_APPLY_REJECT] === "true"}
                    disabled={saving}
                    onChange={(next) =>
                      set(SETTINGS_KEYS.REVIEW_AUTO_APPLY_REJECT, next ? "true" : "false")
                    }
                  />
                </div>

                {/* No switch beside these: the chosen template is the switch,
                    and nothing is written whilst none is chosen. */}
                <p className={introClass}>{t.notifyHint}</p>

                <DashboardCombobox
                  id="review-notify-accept-template"
                  fullWidth
                  label={t.notifyAcceptTemplateLabel}
                  disabled={templatesLoading || saving}
                  value={draft[SETTINGS_KEYS.REVIEW_NOTIFY_ACCEPT_TEMPLATE_ID]}
                  onValueChange={(value) =>
                    set(SETTINGS_KEYS.REVIEW_NOTIFY_ACCEPT_TEMPLATE_ID, value)
                  }
                  options={templateOptions}
                />

                <DashboardCombobox
                  id="review-notify-reject-template"
                  fullWidth
                  label={t.notifyRejectTemplateLabel}
                  disabled={templatesLoading || saving}
                  value={draft[SETTINGS_KEYS.REVIEW_NOTIFY_REJECT_TEMPLATE_ID]}
                  onValueChange={(value) =>
                    set(SETTINGS_KEYS.REVIEW_NOTIFY_REJECT_TEMPLATE_ID, value)
                  }
                  options={templateOptions}
                />
              </DashboardSection.Body>
            </DashboardSection>
          </div>
        ) : null}

        <div className="break-inside-avoid pb-6">
          <DashboardSection>
            <DashboardSection.Header
              icon={<CurrencyDollarIcon weight="duotone" className="size-4" />}
              title={t.costTitle}
            />
            <DashboardSection.Body className="flex flex-col gap-3">
              <p className={introClass}>{t.costHint}</p>

              {/* Side by side: the two ceilings are read against each other, and a
                reader comparing them should not have to scroll between them. */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DashboardNumberInput
                  id="review-cost-check"
                  fullWidth
                  label={t.costPerCheckLabel}
                  hint={t.costPerCheckHint}
                  min={0.01}
                  step={0.5}
                  disabled={saving}
                  value={draft[SETTINGS_KEYS.REVIEW_COST_LIMIT_PER_CHECK_EUR]}
                  onChange={(event) =>
                    set(SETTINGS_KEYS.REVIEW_COST_LIMIT_PER_CHECK_EUR, event.target.value)
                  }
                />

                <DashboardNumberInput
                  id="review-cost-day"
                  fullWidth
                  label={t.costPerDayLabel}
                  hint={t.costPerDayHint}
                  min={0.01}
                  step={1}
                  disabled={saving}
                  value={draft[SETTINGS_KEYS.REVIEW_COST_LIMIT_PER_DAY_EUR]}
                  onChange={(event) =>
                    set(SETTINGS_KEYS.REVIEW_COST_LIMIT_PER_DAY_EUR, event.target.value)
                  }
                />
              </div>
            </DashboardSection.Body>
          </DashboardSection>
        </div>

        <div className="break-inside-avoid pb-6">
          <DashboardSection>
            <DashboardSection.Header
              icon={<EnvelopeIcon weight="duotone" className="size-4" />}
              title={t.reportTitle}
              addOn={
                <ToggleSwitch
                  checked={reportEnabled && templateChosen}
                  disabled={saving || (!templateChosen && !reportEnabled)}
                  onChange={(next) =>
                    set(SETTINGS_KEYS.REVIEW_REPORT_ENABLED, next ? "true" : "false")
                  }
                />
              }
            />
            <DashboardSection.Body className="flex flex-col gap-3">
              <p className={introClass}>{t.reportHint}</p>

              <DashboardCombobox
                id="review-report-template"
                fullWidth
                label={t.reportTemplateLabel}
                hint={templateChosen ? undefined : t.reportRequireTemplate}
                disabled={templatesLoading || saving}
                value={draft[SETTINGS_KEYS.REVIEW_REPORT_TEMPLATE_ID]}
                onValueChange={(value) => {
                  set(SETTINGS_KEYS.REVIEW_REPORT_TEMPLATE_ID, value);
                  if (value === "") set(SETTINGS_KEYS.REVIEW_REPORT_ENABLED, "false");
                }}
                options={templateOptions}
              />
            </DashboardSection.Body>
          </DashboardSection>
        </div>
      </div>

      {saveError ? <p className="text-xs text-[var(--ds-danger-text)]">{saveError}</p> : null}

      {/* In the page footer, where every other settings tab puts its action,
          rather than under the cards where it leaves a hole beside them. */}
      {active ? (
        <PageFooter>
          <SaveActionButton
            onClick={() => void save()}
            disabled={!dirty || saving}
            busy={saving}
            label={saving ? common.saving : common.save}
          />
        </PageFooter>
      ) : null}
    </div>
  );
});
