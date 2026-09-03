import { REJECT_TOKEN_PLACEHOLDER } from "@lmaa/contracts";
import type { ReviewResult } from "@lmaa/contracts";
import { generateRejectionToken } from "@lmaa/shared";
import type { ReviewAutoApplyVerdict } from "@lmaa/shared";

import type { ReviewSettings } from "./settings.js";
import { db } from "../../db/client.js";
import { categories } from "../../db/schema.js";
import { geocodeAddress } from "../../lib/geocoding.js";
import { logger } from "../../lib/logger.js";
import { mapShopJsonToSubmissionEditData } from "../../lib/shopjson-mapper.js";
import { editSubmission, setReadyForReview } from "../../repositories/admin-submissions.js";
import { reviewAdminSubmission } from "../admin-submissions.js";

/**
 * What applying a review result did to the submission.
 */
export type ReviewApplication =
  | { kind: "none"; reason: string }
  | { kind: "enriched" }
  | { kind: "flagged" }
  | { kind: "applied"; status: "approved" | "rejected" }
  | { kind: "conflict"; reason: string };

/**
 * Everything applying a result needs.
 */
export interface ApplyReviewInput {
  submissionId: number;
  result: ReviewResult;
  settings: ReviewSettings;
}

async function loadCategoryNameToId(): Promise<Map<string, number>> {
  const rows = await db.select({ id: categories.id, name: categories.name }).from(categories);
  return new Map(rows.map((row) => [row.name.trim().toLocaleLowerCase("de-DE"), row.id] as const));
}

function mayApply(settings: ReviewSettings, verdict: ReviewAutoApplyVerdict): boolean {
  return settings.mode === "assist" && settings.autoApply.includes(verdict);
}

/**
 * The template an automatically applied decision is written with.
 *
 * @param settings - The current configuration.
 * @param verdict - The decision that was applied.
 * @returns The template id, or `undefined` where nothing should be sent.
 *
 * @remarks
 * A moderator picks the template in the decision dialog. The automation has
 * nobody to pick, so it takes what the operator configured, and the choice is
 * the switch: no template means no mail. Admission and rejection take different
 * templates, because only a rejection carries the link to its public reasoning.
 */
function notificationTemplateId(
  settings: ReviewSettings,
  verdict: ReviewAutoApplyVerdict,
): number | undefined {
  const templateId =
    verdict === "accept" ? settings.notifyAcceptTemplateId : settings.notifyRejectTemplateId;
  return templateId ?? undefined;
}

/**
 * Replaces the rejection placeholder with a freshly generated token.
 *
 * @param comment - The rejection comment as the provider wrote it.
 * @param token - The token the backend generated.
 * @returns The comment with every placeholder replaced.
 *
 * @remarks
 * The token is generated here and never comes from the provider, so the public
 * rejection page cannot be addressed by anything the model produced. The
 * contract already refuses a comment that lost the placeholder or carries a
 * token-shaped string, which is what makes this replacement total.
 */
export function insertRejectionToken(comment: string, token: string): string {
  return comment.split(REJECT_TOKEN_PLACEHOLDER).join(token);
}

/**
 * Writes the researched shop data into the submission.
 *
 * @param submissionId - Submission to enrich.
 * @param result - The validated acceptance result.
 * @returns `true` when the submission still existed.
 *
 * @remarks
 * Uses the same mapping and the same repository call as the manual import, so
 * an automated acceptance and a pasted shop-check produce the same submission.
 */
async function enrichSubmission(submissionId: number, result: ReviewResult): Promise<boolean> {
  if (!result.accept) return false;

  const categoryNameToId = await loadCategoryNameToId();
  const editData = mapShopJsonToSubmissionEditData(
    { ...result.accept, geo: await resolveGeo(result.accept) } as unknown as Record<
      string,
      unknown
    >,
    categoryNameToId,
  );

  const submission = await editSubmission(submissionId, editData);
  if (!submission) return false;

  await setReadyForReview(submissionId, true);
  return true;
}

/**
 * Resolves the coordinates of an accepted shop's headquarters.
 *
 * @param accept - The validated acceptance payload.
 * @returns The coordinates with their source, or what the result already
 * carried when no address could be resolved.
 *
 * @remarks
 * Done here rather than by the model. Geocoding is a lookup with a defined
 * answer, so a model that guesses coordinates is a model inventing a fact, and
 * every lookup it makes is another round trip in a conversation that is re-read
 * in full each time.
 */
async function resolveGeo(accept: NonNullable<ReviewResult["accept"]>): Promise<unknown> {
  const headquarters = accept.headquarters;
  if (!headquarters?.city) return accept.geo ?? null;

  const resolved = await geocodeAddress({
    street: headquarters.street ?? undefined,
    postalCode: headquarters.postalCode ?? undefined,
    city: headquarters.city,
    countryCode: headquarters.countryCode ?? undefined,
  });

  if (!resolved) {
    return {
      latitude: null,
      longitude: null,
      source: "keine",
      unresolvedReason: "Die Anschrift liess sich über die gesamte Kaskade nicht auflösen.",
    };
  }

  return {
    latitude: resolved.latitude,
    longitude: resolved.longitude,
    source: resolved.source,
  };
}

/**
 * Applies a validated review result to its submission.
 *
 * @param input - The submission, the validated result and the current settings.
 * @returns What was done, so the caller can record it and report it.
 *
 * @remarks
 * Everything that changes a submission goes through the existing moderation
 * service rather than writing to the tables directly, so an automated decision
 * creates the same shop, the same categories, the same headquarters and the
 * same search data as a human decision, and the domain-conflict check applies
 * to both.
 *
 * In `assist` mode the researched data is written and the submission is marked
 * ready for a person, so a moderator opens it with every field already filled
 * in. A verdict is only applied publicly when the operator has enabled that
 * verdict, which is a separate switch from turning automation on.
 *
 * An `onhold` verdict never changes the submission's status. It marks the
 * submission ready for review so it surfaces in the queue, and the reason stays
 * on the job where the dashboard shows it. Setting the status would hide the
 * submission from the pending list, which is the opposite of asking somebody to
 * look at it.
 */
export async function applyReviewResult(input: ApplyReviewInput): Promise<ReviewApplication> {
  const { submissionId, result, settings } = input;

  if (settings.mode !== "assist") {
    return { kind: "none", reason: `Modus ${settings.mode} verändert den Vorschlag nicht` };
  }

  if (result.verdict === "onhold") {
    await setReadyForReview(submissionId, true);
    return { kind: "flagged" };
  }

  if (result.verdict === "accept") {
    const enriched = await enrichSubmission(submissionId, result);
    if (!enriched) {
      return { kind: "none", reason: "Der Vorschlag existiert nicht mehr" };
    }

    if (!mayApply(settings, "accept")) return { kind: "enriched" };

    const outcome = await reviewAdminSubmission({
      id: submissionId,
      status: "approved",
      adminId: null,
      notificationTemplateId: notificationTemplateId(settings, "accept"),
      // The same list the manual admission sends, chosen once in the settings
      // rather than per submission, because nobody opens a dialogue here.
      templateAssignments: settings.socialTemplates,
    });

    if (!outcome.ok) {
      if (outcome.reason === "shop_exists") {
        return {
          kind: "conflict",
          reason: `Für diese Domain gibt es bereits den öffentlichen Shop „${outcome.existingShopName}".`,
        };
      }
      return { kind: "none", reason: "Der Vorschlag existiert nicht mehr" };
    }

    return { kind: "applied", status: "approved" };
  }

  // Rejection. The texts stay on the job until somebody applies them, unless
  // automatic rejection is enabled, because a public rejection page is the one
  // outcome that cannot be taken back quietly.
  if (!mayApply(settings, "reject")) {
    await setReadyForReview(submissionId, true);
    return { kind: "flagged" };
  }

  if (!result.reject) {
    return { kind: "none", reason: "Das Ergebnis enthält keine Ablehnungstexte" };
  }

  const token = generateRejectionToken();
  const outcome = await reviewAdminSubmission({
    id: submissionId,
    status: "rejected",
    adminNote: insertRejectionToken(result.reject.comment, token),
    rejectionLongText: result.reject.longText,
    rejectionToken: token,
    adminId: null,
    notificationTemplateId: notificationTemplateId(settings, "reject"),
  });

  if (!outcome.ok) {
    logger.warn(
      { submissionId, reason: outcome.reason },
      "automated rejection could not be applied",
    );
    return { kind: "none", reason: "Der Vorschlag existiert nicht mehr" };
  }

  return { kind: "applied", status: "rejected" };
}
