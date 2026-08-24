import { CheckCircleIcon, RobotIcon, XCircleIcon } from "@phosphor-icons/react";
import { memo, useState } from "react";
import type { ReactNode } from "react";

import { REVIEW_SETTING_DEFAULTS, SETTINGS_KEYS, formatDateTime } from "@lmaa/shared";
import type { ReviewCost, ReviewJobDetail } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { DashboardActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useReloadSubmissionAfterReview,
  useResendReviewReport,
  useRetryReviewJob,
  useReviewJob,
  useStartReviewJob,
} from "@/features/overview/hooks/useReviewJob.ts";
import { readRejectProposal } from "@/features/overview/review-reject-proposal.ts";
import {
  ReviewField,
  reviewLabelClass,
  reviewValueClass,
} from "@/features/overview/ReviewField.tsx";
import { ReviewProgressDialog } from "@/features/overview/ReviewProgressDialog.tsx";
import { useSystemSettings } from "@/features/system/settings/hooks/useSystemSettings.ts";

const ACTIVE_STATES = new Set(["queued", "running", "provider_waiting", "applying"]);

/**
 * Events that mean the check wrote its research into the submission.
 *
 * @remarks
 * The recommendation on its own says nothing about that. A check whose
 * automation was switched off, or whose acceptance collided with a shop that
 * already exists, reaches a verdict and changes nothing, and a card claiming
 * otherwise sends a moderator looking for fields that were never filled.
 */
const APPLIED_EVENTS = new Set(["result.enriched", "result.applied"]);
const TERMINAL_STATES = new Set(["completed", "failed", "cancelled"]);

/** Nano-units per whole currency unit, matching the backend's counting. */
const NANO_PER_UNIT = 1_000_000_000;

/**
 * Renders an amount, marking it when a billable dimension was missing.
 *
 * @param cost - The amount, or `null` when nothing has been costed yet.
 * @returns The amount as text, or a dash.
 */
function formatCost(cost: ReviewCost | null): string {
  if (!cost) return "–";
  const amount = (Number(cost.totalNano) / NANO_PER_UNIT).toFixed(4);
  return cost.complete
    ? `${amount} ${cost.currency}`
    : `${amount} ${cost.currency} (unvollständig)`;
}

/**
 * A short statement about what the automation recommends.
 *
 * @param colorClass - Background and text colour, matching the recommendation.
 * @param icon - Shown before the text.
 * @param children - The statement.
 * @returns The notice.
 *
 * @remarks
 * Carries its own surface rather than sitting in the body text, because it is
 * the one thing on this card a moderator has to see before deciding.
 */
function Notice({
  colorClass,
  icon,
  children,
}: {
  colorClass: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${colorClass}`}>
      {icon}
      <p>{children}</p>
    </div>
  );
}

/**
 * Shows the automated review of one submission and its controls.
 *
 * @remarks
 * The panel is deliberately read-mostly. Approving and rejecting stay in the
 * existing review dialogs, and this only offers what the automation itself owns:
 * starting a check, stopping one, running it again, and copying the texts it
 * proposed so a moderator can decide with them in front of them.
 */
export const SubmissionReviewPanel = memo(function SubmissionReviewPanel({
  submissionId,
}: {
  submissionId: number;
}) {
  const { locale, messages } = useI18n();
  const t = messages.submissions.review;

  const [progressOpen, setProgressOpen] = useState(false);
  const { data: job } = useReviewJob(submissionId);
  const { data: settings } = useSystemSettings();
  useReloadSubmissionAfterReview(submissionId, job?.state);
  const configuredModel =
    settings?.[SETTINGS_KEYS.REVIEW_MODEL] ?? REVIEW_SETTING_DEFAULTS[SETTINGS_KEYS.REVIEW_MODEL];
  const start = useStartReviewJob(submissionId);
  const retry = useRetryReviewJob(submissionId);
  const resend = useResendReviewReport(submissionId);

  if (!job) {
    return (
      <>
        <ReviewProgressDialog
          submissionId={submissionId}
          open={progressOpen}
          onClose={() => setProgressOpen(false)}
        />
        <DashboardSection>
          <DashboardSection.Header
            icon={<RobotIcon weight="duotone" className="size-4" />}
            title={t.title}
            addOn={
              <DashboardActionButton
                action="startCheck"
                onClick={() => start.mutate(undefined, { onSuccess: () => setProgressOpen(true) })}
                busy={start.isPending}
                disabled={start.isPending}
              />
            }
          />
          <DashboardSection.Body className="flex flex-col gap-1">
            <p className={reviewValueClass}>{t.none}</p>
            <p className="text-sm text-[var(--ds-text-muted)]">{t.noneHint}</p>
          </DashboardSection.Body>
        </DashboardSection>
      </>
    );
  }

  const detail: ReviewJobDetail = job;
  // The acceptance notice speaks about the fields of this page, so it holds
  // only where the check actually wrote them. The rejection notice speaks about
  // the dialog, which is filled from the result on the job, so it holds as soon
  // as the result carries the texts.
  const applied = detail.events.some((entry) => APPLIED_EVENTS.has(entry.event));
  const hasRejectTexts = readRejectProposal(detail.result) !== null;
  const active = ACTIVE_STATES.has(detail.state);
  const terminal = TERMINAL_STATES.has(detail.state);

  return (
    <>
      <ReviewProgressDialog
        submissionId={submissionId}
        open={progressOpen}
        onClose={() => setProgressOpen(false)}
      />
      <DashboardSection>
        <DashboardSection.Header
          icon={<RobotIcon weight="duotone" className="size-4" />}
          title={t.title}
          addOn={
            active ? (
              <DashboardActionButton
                action="startCheck"
                label={t.progress.show}
                onClick={() => setProgressOpen(true)}
              />
            ) : (
              <DashboardActionButton
                action="retryCheck"
                onClick={() => retry.mutate(detail.id, { onSuccess: () => setProgressOpen(true) })}
                busy={retry.isPending}
                disabled={retry.isPending}
              />
            )
          }
        />

        <DashboardSection.Body className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <ReviewField label={t.stateLabel} value={t.states[detail.state]} />
            <ReviewField
              label={t.verdictLabel}
              value={detail.verdict ? t.verdicts[detail.verdict] : "–"}
            />
            <ReviewField label={t.modelLabel} value={detail.model ?? configuredModel} />
            <ReviewField label={t.costLabel} value={formatCost(detail.cost)} />
            <ReviewField
              label={t.attemptLabel}
              value={`${detail.attempt} / ${detail.maxAttempts}`}
            />
            <ReviewField label={t.reportLabel} value={detail.reportState} />
            <ReviewField
              label={t.checkedAtLabel}
              value={
                detail.finishedAt
                  ? formatDateTime(detail.finishedAt, locale)
                  : "–"
              }
            />
          </div>

          {detail.onholdReason ? (
            <div className="flex flex-col gap-1">
              <span className={reviewLabelClass}>{t.onholdLabel}</span>
              <p className={reviewValueClass}>{detail.onholdReason}</p>
            </div>
          ) : null}

          {detail.verdict === "reject" && hasRejectTexts ? (
            <Notice
              colorClass="bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)]"
              icon={<XCircleIcon weight="duotone" className="size-5 shrink-0" />}
            >
              {t.proposalPrefilled}
            </Notice>
          ) : null}

          {detail.verdict === "accept" && applied ? (
            <Notice
              colorClass="bg-[var(--ds-badge-success-bg)] text-[var(--ds-badge-success-text)]"
              icon={<CheckCircleIcon weight="duotone" className="size-5 shrink-0" />}
            >
              {t.acceptPrefilled}
            </Notice>
          ) : null}

          {detail.events.length > 0 ? (
            <details>
              <summary className={`${reviewLabelClass} cursor-pointer`}>{t.timelineLabel}</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {detail.events.map((entry) => (
                  <li key={entry.id} className="text-xs text-[var(--ds-text-muted)]">
                    <span className="font-mono">
                      {formatDateTime(entry.createdAt, locale)}
                    </span>{" "}
                    {entry.event}
                    {entry.detail ? ` — ${entry.detail}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </DashboardSection.Body>

        {terminal && detail.reportState === "failed" ? (
          <DashboardSection.Footer className="flex justify-end">
            <DashboardActionButton
              action="retryCheck"
              label={t.resendReport}
              onClick={() => resend.mutate(detail.id)}
              busy={resend.isPending}
              disabled={resend.isPending}
            />
          </DashboardSection.Footer>
        ) : null}
      </DashboardSection>
    </>
  );
});
