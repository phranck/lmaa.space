import type { SubmissionConfig } from "@lmaa/contracts";

import { renderEmailTemplate } from "./email-renderer.js";
import { sendMail } from "./email.js";
import { notifyOwnerOfNewShopSubmission } from "./owner-notifications.js";
import { escapeHtml } from "../lib/html.js";
import { logger } from "../lib/logger.js";
import { createSubmissionFromFormData } from "../repositories/admin-submissions.js";
import { getEmailTemplateById } from "../repositories/email-templates.js";
import { insertFormSubmission } from "../repositories/form-submission.js";

const DEFAULT_SUBMISSION_SUBJECT = "Neue Formular-Übermittlung";

/**
 * Executes the submission chain defined in `config.steps`.
 *
 * Steps run sequentially in definition order. Any step failure is propagated
 * to the caller — partial execution is not retried.
 *
 * @param config     - Submission config containing the chain steps.
 * @param data       - Submitted field values keyed by field name/id.
 * @param formConfig - Minimal form config metadata (id, name).
 */
export async function executeSubmissionChain(
  config: SubmissionConfig,
  data: Record<string, unknown>,
  formConfig: { id: number; name: string },
): Promise<void> {
  await config.steps.reduce(
    (previous, step) => previous.then(() => executeSubmissionStep(step, data, formConfig)),
    Promise.resolve(),
  );
}

async function executeSubmissionStep(
  step: SubmissionConfig["steps"][number],
  data: Record<string, unknown>,
  formConfig: { id: number; name: string },
): Promise<void> {
  switch (step.type) {
    case "store":
      await handleStore(formConfig.id, data);
      break;
    case "create-shop-suggestion": {
      const submissionId = await createSubmissionFromFormData(data);
      void notifyOwnerOfNewShopSubmission(submissionId, data);
      break;
    }
    case "email": {
      const to =
        step.toFieldId && typeof data[step.toFieldId] === "string"
          ? (data[step.toFieldId] as string)
          : step.to;
      logger.debug({ toFieldId: step.toFieldId, resolvedTo: to }, "email step resolve");
      await handleEmail(
        to,
        step.subject,
        step.replyToFieldId,
        data,
        formConfig.name,
        step.templateId,
      );
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Step handlers
// ---------------------------------------------------------------------------

async function handleStore(formConfigId: number, data: Record<string, unknown>): Promise<void> {
  await insertFormSubmission(formConfigId, data);
}

function buildPlainTable(data: Record<string, unknown>): string {
  const rows = Object.entries(data)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 8px;font-weight:600">${escapeHtml(k)}</td><td style="padding:4px 8px">${escapeHtml(String(v ?? ""))}</td></tr>`,
    )
    .join("");
  return `<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${rows}</table>`;
}

async function handleEmail(
  to: string,
  subject: string | undefined,
  replyToFieldId: string | undefined,
  data: Record<string, unknown>,
  formName: string,
  templateId?: number,
): Promise<void> {
  const replyTo =
    replyToFieldId && typeof data[replyToFieldId] === "string"
      ? (data[replyToFieldId] as string)
      : undefined;

  const variables = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? "")]));

  let html: string;
  let resolvedSubject = subject ?? `${DEFAULT_SUBMISSION_SUBJECT}: ${formName}`;

  if (templateId) {
    const template = await getEmailTemplateById(templateId);
    if (template) {
      const rendered = await renderEmailTemplate(template, variables);
      html = rendered.html;
      resolvedSubject = rendered.subject;
    } else {
      html = buildPlainTable(data);
    }
  } else {
    html = buildPlainTable(data);
  }

  await sendMail(to, resolvedSubject, html, { replyTo });
}
