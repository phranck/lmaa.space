import type { SupportPrompt } from "@lmaa/contracts";

/** What a prompt does today, as a reader would experience it. */
export type SupportPromptState = "draft" | "scheduled" | "live" | "expired";

/**
 * Works out what a prompt does on a given day.
 *
 * The window is compared by day rather than by moment, so a prompt that names
 * its last day is still shown on that day.
 *
 * @param prompt - The prompt to judge.
 * @param today - The day to judge against, as `YYYY-MM-DD`.
 * @returns Whether it is a draft, waiting, running, or over.
 */
export function promptState(prompt: SupportPrompt, today: string): SupportPromptState {
  if (!prompt.published) return "draft";
  if (prompt.startsAt && today < prompt.startsAt) return "scheduled";
  if (prompt.endsAt && today > prompt.endsAt) return "expired";
  return "live";
}
