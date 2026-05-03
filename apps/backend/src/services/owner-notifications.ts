import { SETTINGS_KEYS } from "@lmaa/shared";

import { renderEmailTemplate } from "./email-renderer.js";
import { sendMail } from "./email.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { getSettings } from "../repositories/app-settings.js";
import { getEmailTemplateById } from "../repositories/email-templates.js";

/**
 * Sends an email notification to the site owner when a new shop suggestion
 * has been created.
 *
 * Controlled by two app settings:
 * - `notifications.newShopSubmission.enabled` — `"true"` to enable
 * - `notifications.newShopSubmission.templateId` — numeric template id
 *
 * Silently no-ops (with a log line) if the feature is disabled, the template
 * is missing, or `OWNER_EMAIL` is not configured. Never throws — callers can
 * safely invoke this as fire-and-forget and must not depend on its outcome.
 */
export async function notifyOwnerOfNewShopSubmission(
  submissionId: number,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const ownerEmail = env.OWNER_EMAIL;
    if (!ownerEmail) {
      logger.debug("owner notification skipped: OWNER_EMAIL not set");
      return;
    }

    const settings = await getSettings([
      SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_ENABLED,
      SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_TEMPLATE_ID,
    ]);

    if (settings[SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_ENABLED] !== "true") {
      logger.debug("owner notification skipped: disabled");
      return;
    }

    const rawId = settings[SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_TEMPLATE_ID];
    const templateId = rawId ? Number.parseInt(rawId, 10) : Number.NaN;
    if (!Number.isFinite(templateId) || templateId <= 0) {
      logger.warn({ rawId }, "owner notification skipped: invalid template id");
      return;
    }

    const template = await getEmailTemplateById(templateId);
    if (!template) {
      logger.warn({ templateId }, "owner notification skipped: template not found");
      return;
    }

    const variables = buildTemplateVariables(submissionId, data);
    const rendered = await renderEmailTemplate(template, variables);
    await sendMail(ownerEmail, rendered.subject, rendered.html);
  } catch (err) {
    logger.error({ err }, "owner notification failed");
  }
}

function buildTemplateVariables(
  submissionId: number,
  data: Record<string, unknown>,
): Record<string, string> {
  const variables: Record<string, string> = {
    submissionId: String(submissionId),
    dashboardUrl: `${env.DASHBOARD_URL}/submissions/${submissionId}`,
  };

  for (const [key, value] of Object.entries(data)) {
    if (value == null) {
      variables[key] = "";
    } else if (Array.isArray(value)) {
      variables[key] = value.join(", ");
    } else {
      variables[key] = String(value);
    }
  }

  return variables;
}
