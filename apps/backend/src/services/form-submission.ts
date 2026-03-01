import type { SubmissionConfig } from "@lmaa/contracts";
import { env } from "../config/env.js";
import { createSubmissionFromFormData } from "../repositories/admin-submissions.js";
import { getEmailTemplateById } from "../repositories/email-templates.js";
import { insertFormSubmission } from "../repositories/form-submission.js";
import { renderEmailTemplate } from "./email-renderer.js";

const FROM = env.EMAIL_FROM;

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
  for (const step of config.steps) {
    switch (step.type) {
      case "store":
        await handleStore(formConfig.id, data);
        break;
      case "create-shop-suggestion":
        await createSubmissionFromFormData(data);
        break;
      case "email": {
        const to =
          step.toFieldId && typeof data[step.toFieldId] === "string"
            ? (data[step.toFieldId] as string)
            : step.to;
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
        `<tr><td style="padding:4px 8px;font-weight:600">${k}</td><td style="padding:4px 8px">${String(v ?? "")}</td></tr>`,
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
  // Resend is loaded lazily to avoid startup failure when not configured
  const { Resend } = await import("resend");
  if (!env.RESEND_API_KEY) return;

  const resend = new Resend(env.RESEND_API_KEY);

  const replyTo =
    replyToFieldId && typeof data[replyToFieldId] === "string"
      ? (data[replyToFieldId] as string)
      : undefined;

  const variables = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? "")]));

  let html: string;
  let resolvedSubject = subject ?? `Neue Formular-Übermittlung: ${formName}`;

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

  await resend.emails.send({
    from: FROM,
    to,
    subject: resolvedSubject,
    ...(replyTo ? { replyTo } : {}),
    html,
  });
}
