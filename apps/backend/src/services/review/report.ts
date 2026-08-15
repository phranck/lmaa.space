import { randomUUID } from "node:crypto";

import type { ReviewAttemptRecord, ReviewCost, ReviewUsage } from "@lmaa/shared";

import type { ReviewSettings } from "./settings.js";
import { env } from "../../config/env.js";
import type { ReviewJobRow } from "../../db/schema.js";
import { logger } from "../../lib/logger.js";
import { formatReviewCost } from "../../lib/review-cost.js";
import { getEmailTemplateById } from "../../repositories/email-templates.js";
import { getSubmissionForReview } from "../../repositories/review-jobs.js";
import { renderEmailTemplate } from "../email-renderer.js";
import { sendMail } from "../email.js";

/**
 * Result of one delivery attempt.
 */
export type ReviewReportDelivery =
  | { ok: true }
  | { ok: false; reason: string; errorId: string | null };

const VERDICT_LABELS: Record<string, string> = {
  accept: "Aufnahme empfohlen",
  reject: "Ablehnung empfohlen",
  onhold: "Zurückgestellt",
};

const MODE_LABELS: Record<string, string> = {
  off: "abgeschaltet",
  assist: "unterstützend",
};

function formatNumber(value: number | undefined): string {
  return (value ?? 0).toLocaleString("de-DE");
}

function toCost(job: ReviewJobRow): ReviewCost {
  return {
    totalNano: job.costNano.toString(),
    currency: job.costCurrency ?? "USD",
    rateCardVersion: job.costRateCardVersion ?? "unbekannt",
    complete: job.costComplete,
    missingDimensions: job.costMissingDimensions,
  };
}

/**
 * Renders the itemized attempt list as plain text.
 *
 * @param attempts - Every attempt belonging to the check.
 * @returns One line per attempt, or a note when there were none.
 *
 * @remarks
 * Retries and failed attempts appear here rather than being folded into the
 * total, because a check that cost twice as much as usual is only explicable
 * when the attempts that produced it are visible.
 */
function renderAttempts(attempts: readonly ReviewAttemptRecord[]): string {
  if (attempts.length === 0) return "keine Versuche aufgezeichnet";

  return attempts
    .map((attempt) => {
      const cost = formatReviewCost(attempt.cost);
      const tokens = `in ${formatNumber(attempt.usage.inputTokens)} / out ${formatNumber(attempt.usage.outputTokens)}`;
      const error = attempt.errorCode ? ` [${attempt.errorCode}]` : "";
      return `Versuch ${attempt.attempt}: ${attempt.outcome}${error}, ${tokens}, ${cost}`;
    })
    .join("\n");
}

/**
 * Renders the machine-readable usage and cost block.
 *
 * @param job - The finished job.
 * @returns A plain-text block suitable for copying into an audit record.
 */
function renderUsageBlock(job: ReviewJobRow): string {
  const usage: ReviewUsage = job.usage ?? {};
  const cost = toCost(job);

  return [
    `submission=${job.submissionId}`,
    `job=${job.id}`,
    `verdict=${job.verdict ?? "-"}`,
    `mode=${job.mode}`,
    `provider=${job.provider ?? "-"}`,
    `model=${job.model ?? "-"}`,
    `effort=${job.reasoningEffort ?? "-"}`,
    `skill=${job.skillVersion ?? "-"}`,
    `schema=${job.schemaVersion ?? "-"}`,
    `attempts=${job.attempt}`,
    `input_tokens=${usage.inputTokens ?? 0}`,
    `cache_write_tokens=${usage.cacheWriteTokens ?? 0}`,
    `cached_input_tokens=${usage.cachedInputTokens ?? 0}`,
    `output_tokens=${usage.outputTokens ?? 0}`,
    `reasoning_tokens=${usage.reasoningTokens ?? 0}`,
    `web_searches=${usage.webSearchCalls ?? 0}`,
    `tool_calls=${usage.toolCalls ?? 0}`,
    `cost_nano=${cost.totalNano}`,
    `cost_currency=${cost.currency}`,
    `cost_complete=${cost.complete}`,
    `rate_card=${cost.rateCardVersion}`,
    cost.missingDimensions.length > 0
      ? `cost_missing=${cost.missingDimensions.join(",")}`
      : "cost_missing=",
  ].join("\n");
}

/**
 * Builds the template variables for one report.
 *
 * @param job - The finished job.
 * @param shop - Name and address of the submitted shop.
 * @param reportId - Stable identifier of this report.
 * @returns Every documented variable, as plain strings.
 *
 * @remarks
 * Values are plain text. The template renderer escapes them, so nothing a
 * provider or a submitter wrote can become markup or a live link in the email.
 */
function buildVariables(
  job: ReviewJobRow,
  shop: { shopName: string; shopUrl: string },
  reportId: string,
): Record<string, string> {
  const usage: ReviewUsage = job.usage ?? {};
  const cost = toCost(job);
  const durationMs =
    job.finishedAt && job.startedAt ? job.finishedAt.getTime() - job.startedAt.getTime() : 0;

  return {
    reportId,
    submissionId: String(job.submissionId),
    jobId: String(job.id),
    shopName: shop.shopName,
    shopUrl: shop.shopUrl,
    dashboardUrl: `${env.DASHBOARD_URL}/submissions/${job.submissionId}`,
    mode: MODE_LABELS[job.mode] ?? job.mode,
    state: job.state,
    verdict: job.verdict ?? "-",
    verdictLabel: job.verdict ? (VERDICT_LABELS[job.verdict] ?? job.verdict) : "kein Ergebnis",
    onholdReason: job.onholdReason ?? "",
    sourceCount: String(job.evidence.length),
    provider: job.provider ?? "-",
    model: job.model ?? "-",
    effort: job.reasoningEffort ?? "-",
    skillVersion: job.skillVersion ?? "-",
    schemaVersion: job.schemaVersion ?? "-",
    attempts: String(job.attempt),
    durationSeconds: String(Math.round(durationMs / 1000)),
    inputTokens: formatNumber(usage.inputTokens),
    cacheWriteTokens: formatNumber(usage.cacheWriteTokens),
    cachedInputTokens: formatNumber(usage.cachedInputTokens),
    outputTokens: formatNumber(usage.outputTokens),
    reasoningTokens: formatNumber(usage.reasoningTokens),
    webSearchCalls: formatNumber(usage.webSearchCalls),
    toolCalls: formatNumber(usage.toolCalls),
    costTotal: formatReviewCost(cost),
    costCurrency: cost.currency,
    costComplete: cost.complete ? "vollständig" : "unvollständig",
    costMissing: cost.missingDimensions.join(", "),
    rateCardVersion: cost.rateCardVersion,
    attemptBreakdown: renderAttempts(job.attempts),
    usageBlock: renderUsageBlock(job),
    errorCode: job.errorCode ?? "",
    errorId: job.errorId ?? "",
  };
}

/**
 * Sends the admin report for one finished check.
 *
 * @param job - The finished job.
 * @param settings - Current review settings, which name the template.
 * @returns Whether the mail was accepted, and why not when it was not.
 *
 * @remarks
 * Delivery never changes the moderation outcome. A report that cannot be sent
 * leaves the check exactly as it was and comes back on the next tick, because
 * the alternative would be a verdict that depends on a mail server.
 *
 * The report goes to `OWNER_EMAIL` over the transport the rest of the site
 * already uses. Introducing a second mail path for one report would be a second
 * thing to configure, monitor and rotate.
 */
export async function sendReviewReport(
  job: ReviewJobRow,
  settings: ReviewSettings,
): Promise<ReviewReportDelivery> {
  const recipient = env.OWNER_EMAIL;
  if (!recipient) {
    return { ok: false, reason: "OWNER_EMAIL ist nicht gesetzt", errorId: null };
  }

  if (settings.reportTemplateId === null) {
    return { ok: false, reason: "Für den Bericht ist kein E-Mail-Template gewählt", errorId: null };
  }

  const template = await getEmailTemplateById(settings.reportTemplateId);
  if (!template) {
    return {
      ok: false,
      reason: `Das gewählte E-Mail-Template ${settings.reportTemplateId} existiert nicht`,
      errorId: null,
    };
  }

  const submission = await getSubmissionForReview(job.submissionId);
  if (!submission) {
    return { ok: false, reason: "Der Vorschlag existiert nicht mehr", errorId: null };
  }

  const reportId = `report-${job.id}-${job.attempt}`;
  const variables = buildVariables(job, submission, reportId);

  try {
    const rendered = await renderEmailTemplate(template, variables);
    const accepted = await sendMail(recipient, rendered.subject, rendered.html, {
      errorSource: "review-report",
    });

    if (!accepted) {
      return { ok: false, reason: "Der Mailversand wurde nicht bestätigt", errorId: null };
    }
    return { ok: true };
  } catch (error) {
    const errorId = randomUUID();
    logger.error({ err: error, jobId: job.id, errorId }, "review report rendering failed");
    return { ok: false, reason: "Der Bericht konnte nicht erzeugt werden", errorId };
  }
}
