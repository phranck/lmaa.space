/**
 * Runs one automated shop review end to end, against the real provider.
 *
 * @remarks
 * Creates a synthetic submission for the given URL, lets the worker claim and
 * run it exactly as it would a real one, prints what came back, and removes the
 * submission again. The job is marked synthetic, so no report email is sent and
 * the check is distinguishable from a real one in every read model.
 *
 * This is what an evaluation run uses: it exercises the whole path, including
 * the provider, the contract and the cost calculation, without involving a
 * person's suggestion.
 *
 * Usage:
 *
 * ```bash
 * npm run review:shop -w @lmaa/backend -- https://example.com
 * npm run review:shop -w @lmaa/backend -- https://example.com --keep
 * ```
 *
 * `--keep` leaves the submission and its check in the database, so the result
 * can be looked at in the dashboard. Without it the probe removes what it
 * created, which is what makes it safe to run against production data.
 */
import { eq } from "drizzle-orm";

import { client, db } from "../db/client.js";
import { reviewJobs, submissions } from "../db/schema.js";
import { logger } from "../lib/logger.js";
import { formatReviewCost } from "../lib/review-cost.js";
import { enqueueReviewJob, getReviewJobBySubmission } from "../repositories/review-jobs.js";
import { AnthropicReviewProvider } from "../services/review/anthropic-provider.js";
import { loadReviewSettings } from "../services/review/settings.js";
import { ReviewWorker } from "../services/review/worker.js";

/** Prefix that makes a submission created by this script identifiable. */
const SYNTHETIC_PREFIX = "[synthetic review probe]";

/** How long the script waits for the run before giving up. */
const MAX_WAIT_MS = 15 * 60 * 1000;

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const keep = args.includes("--keep");
  const url = args.find((arg) => !arg.startsWith("--"));
  if (!url) fail("Usage: npm run review:shop -w @lmaa/backend -- <shop-url> [--keep]");

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return fail(`Not a URL: ${url}`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    fail(`Only http and https are supported, got ${parsed.protocol}`);
  }

  const settings = await loadReviewSettings();
  const provider = new AnthropicReviewProvider({
    model: settings.model,
    effort: settings.effort,
  });
  if (!provider.isConfigured()) fail("ANTHROPIC_API_KEY is not set");

  process.stdout.write(
    `Prüfe ${parsed.href}\n  Modell ${settings.model}, Effort ${settings.effort}, Modus ${settings.mode}\n\n`,
  );

  const [submission] = await db
    .insert(submissions)
    .values({
      shopName: `${SYNTHETIC_PREFIX} ${parsed.hostname}`,
      shopUrl: parsed.href,
      region: [],
    })
    .returning({ id: submissions.id });

  try {
    await enqueueReviewJob(db, submission.id, { synthetic: true });

    // The worker is driven directly rather than on its timer, so the script
    // finishes when the run does. It is the same class the scheduler uses, so
    // this exercises the real path and not a copy of it.
    // Automatic application is switched off for the probe whatever the operator
    // has configured, so a probe can never publish a shop or a rejection page.
    // The enrichment still runs, and it lands on the synthetic submission this
    // script created and removes again.
    const worker = new ReviewWorker(
      () => provider,
      () => Promise.resolve({ ...settings, mode: "assist", autoApply: [], reportEnabled: false }),
    );
    const startedAt = Date.now();

    for (;;) {
      await worker.tick();
      const job = await getReviewJobBySubmission(submission.id);
      if (!job) fail("The job disappeared before it finished");

      if (job.state === "completed" || job.state === "failed" || job.state === "cancelled") {
        process.stdout.write(
          [
            `Zustand:   ${job.state}`,
            `Verdikt:   ${job.verdict ?? "-"}`,
            `Versuche:  ${job.attempt}`,
            `Kosten:    ${
              job.costCurrency
                ? formatReviewCost({
                    totalNano: job.costNano.toString(),
                    currency: job.costCurrency,
                    rateCardVersion: job.costRateCardVersion ?? "unbekannt",
                    complete: job.costComplete,
                    missingDimensions: job.costMissingDimensions,
                  })
                : "-"
            }`,
            `Tokens:    in ${job.usage?.inputTokens ?? 0}, cache ${job.usage?.cachedInputTokens ?? 0}, out ${job.usage?.outputTokens ?? 0}, Suchen ${job.usage?.webSearchCalls ?? 0}`,
            job.onholdReason ? `Grund:     ${job.onholdReason}` : "",
            job.errorCode ? `Fehler:    ${job.errorCode}` : "",
            "",
            "Ergebnis:",
            JSON.stringify(job.result, null, 2),
          ]
            .filter(Boolean)
            .join("\n") + "\n",
        );
        return;
      }

      if (Date.now() - startedAt > MAX_WAIT_MS) {
        fail(`The run did not finish within ${MAX_WAIT_MS / 60000} minutes, state ${job.state}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } finally {
    if (keep) {
      process.stdout.write(
        `\nVorgang ${submission.id} bleibt stehen, sichtbar unter Meldungen, Automatische Prüfungen.\n`,
      );
    } else {
      // Removing the submission cascades to its job, so the probe leaves
      // nothing behind even when the run failed part-way.
      await db.delete(reviewJobs).where(eq(reviewJobs.submissionId, submission.id));
      await db.delete(submissions).where(eq(submissions.id, submission.id));
    }
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  logger.error({ err: error }, "review probe failed");
  process.exit(1);
});
