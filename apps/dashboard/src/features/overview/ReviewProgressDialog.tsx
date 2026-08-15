import { CheckCircleIcon, RobotIcon, SpinnerGapIcon, XCircleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import type { ReviewJobDetail } from "@lmaa/shared";

import { CancelActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useCancelReviewJob, useReviewJob } from "@/features/overview/hooks/useReviewJob.ts";
import { ReviewField } from "@/features/overview/ReviewField.tsx";

const ACTIVE_STATES = new Set(["queued", "running", "provider_waiting", "applying"]);

/**
 * How often the open dialog asks for the state of the run.
 *
 * @remarks
 * Shorter than the interval the detail page uses, because somebody watching a
 * dialog is waiting for it, whilst somebody reading the page is not.
 */
const DIALOG_POLL_INTERVAL_MS = 3_000;

/** How often the elapsed time is redrawn. */
const CLOCK_INTERVAL_MS = 1_000;

/** Surface of a block inside the dialog body, as the other dialogs use it. */
const blockClass = "rounded-lg border border-[var(--ds-border)] p-3";

/**
 * Formats a duration as minutes and seconds.
 *
 * @param milliseconds - How long the run has been going.
 * @returns The duration, for example `04:07`.
 */
function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Counts up for as long as the run lasts.
 *
 * @param startedAt - When the worker took the job, or `null` before it did.
 * @param active - Whether the run is still going.
 * @returns The elapsed time, or `null` when there is nothing to count from.
 */
function useElapsed(startedAt: string | null, active: boolean): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), CLOCK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [active]);

  if (!startedAt) return null;
  return formatElapsed(now - new Date(startedAt).getTime());
}

/**
 * Shows what a running check is doing, and lets a moderator stop it.
 *
 * @param submissionId - Submission whose check is shown.
 * @param open - Whether the dialog is visible.
 * @param onClose - Called when the dialog should close.
 * @returns The dialog.
 *
 * @remarks
 * Closing the dialog does not stop the run. That is what the stop button is
 * for, and the text says so, because a dialog that appears when work starts
 * otherwise reads as if the work belonged to it.
 */
export function ReviewProgressDialog({
  submissionId,
  open,
  onClose,
}: {
  submissionId: number;
  open: boolean;
  onClose: () => void;
}) {
  const { messages } = useI18n();
  const t = messages.submissions.review;
  const progress = t.progress;

  const { data: job } = useReviewJob(submissionId, open ? DIALOG_POLL_INTERVAL_MS : undefined);
  const cancel = useCancelReviewJob(submissionId);

  const detail: ReviewJobDetail | null = job ?? null;
  const active = detail !== null && ACTIVE_STATES.has(detail.state);
  // Counted from when the worker took the job, not from when it was queued. A
  // retried job keeps its original creation time, so counting from that would
  // show the age of the suggestion rather than the length of this run.
  const elapsed = useElapsed(detail?.startedAt ?? null, active);

  // What the run reports it is doing, which the worker overwrites as the check
  // proceeds. Where nothing has been reported yet, the last recorded step of
  // this attempt stands in, so the line is not empty for the first minute.
  const lastEvent = detail?.events.filter((entry) => entry.attempt === detail.attempt).at(-1);
  const currentStep =
    detail?.progress ??
    (lastEvent ? (t.events[lastEvent.event as keyof typeof t.events] ?? lastEvent.event) : null);

  const hint =
    !detail || detail.state === "queued"
      ? progress.queuedHint
      : active
        ? progress.runningHint
        : progress.doneHint;

  return (
    <OverlayCard
      open={open}
      onClose={onClose}
      size={{ storageKey: "review-progress-dialog-size", defaultWidth: 512 }}
      aria-label={progress.title}
    >
      <OverlayCard.Header>
        <div className="flex min-w-0 items-center gap-3">
          <RobotIcon weight="duotone" className={dialogHeaderIconClass} />
          <h3 className="font-semibold text-[var(--ds-text)]">{progress.title}</h3>
        </div>
      </OverlayCard.Header>

      <OverlayCard.Body className="flex flex-col gap-3">
        <div className={blockClass}>
          <div className="flex items-center gap-2">
            {active ? (
              <SpinnerGapIcon
                weight="duotone"
                className="size-4 shrink-0 animate-spin text-[var(--color-primary)]"
              />
            ) : detail?.verdict === "reject" ? (
              <XCircleIcon
                weight="duotone"
                className="size-4 shrink-0 text-[var(--ds-badge-danger-text)]"
              />
            ) : (
              <CheckCircleIcon
                weight="duotone"
                className="size-4 shrink-0 text-[var(--ds-badge-success-text)]"
              />
            )}
            <span className="text-sm font-medium text-[var(--ds-text)]">
              {detail ? t.states[detail.state] : t.states.queued}
            </span>
            {elapsed ? (
              <span className="ml-auto text-xs tabular-nums text-[var(--ds-text-subtle)]">
                {progress.elapsedLabel} {elapsed}
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm text-[var(--ds-text-muted)]">{hint}</p>
          {currentStep ? (
            <p className="mt-1.5 text-xs text-[var(--ds-text-subtle)]">{currentStep}</p>
          ) : null}
        </div>

        {detail ? (
          <div className="grid grid-cols-2 gap-3">
            <ReviewField label={t.modelLabel} value={detail.model ?? "–"} />
            <ReviewField
              label={t.attemptLabel}
              value={`${detail.attempt} / ${detail.maxAttempts}`}
            />
          </div>
        ) : null}
      </OverlayCard.Body>

      {/* Stopping whilst it runs, acknowledging once it is done. There is
          nothing to offer in between, so the footer is absent then. */}
      {active && detail ? (
        <OverlayCard.Footer className="flex justify-end gap-2">
          <CancelActionButton
            label={progress.stopCheck}
            onClick={() => cancel.mutate(detail.id)}
            busy={cancel.isPending}
            disabled={cancel.isPending}
          />
        </OverlayCard.Footer>
      ) : detail ? (
        <OverlayCard.Footer className="flex justify-end gap-2">
          <DashboardButton variant="primary" onClick={onClose}>
            {messages.common.ok}
          </DashboardButton>
        </OverlayCard.Footer>
      ) : null}
    </OverlayCard>
  );
}
