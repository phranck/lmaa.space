import type { SupportPrompt, SupportPromptLimits, SupportPromptSlot } from "@lmaa/contracts";

import { apiGet } from "@/lib/api";
import { renderMarkdown } from "@/lib/markdown";

/**
 * The prompts a page hands to its island.
 *
 * The content is rendered to HTML here, on the server, through the same
 * pipeline as any other page text. The island only decides whether to show it,
 * because that decision needs the reader's own history and that lives in their
 * browser.
 */

/** One prompt, ready to be drawn. */
export interface RenderedSupportPrompt {
  id: string;
  kind: SupportPrompt["kind"];
  html: string;
  buttonLabel: string;
  buttonHref: string;
  dismissLabel: string;
  threshold: number;
  priority: number;
}

/** What a slot needs to draw at most one prompt. */
export interface SupportPromptSlotData {
  prompts: RenderedSupportPrompt[];
  limits: SupportPromptLimits;
}

/** Nothing to show, which is also the answer when the backend is unreachable. */
const EMPTY: SupportPromptSlotData = { prompts: [], limits: { maxShown: 4, snoozeDays: 14 } };

/**
 * Loads the prompts for one slot and renders their content.
 *
 * A page that cannot reach the backend still renders: a missing ask is worth
 * less than a broken page, so the failure is swallowed deliberately and the
 * slot stays empty.
 *
 * @param slot - The place asking.
 * @returns The prompts for that slot, in the order the server prefers them.
 */
export async function loadSupportPrompts(slot: SupportPromptSlot): Promise<SupportPromptSlotData> {
  try {
    const payload = await apiGet<{ prompts: SupportPrompt[]; limits: SupportPromptLimits }>(
      "/support-prompts",
    );

    const prompts = await Promise.all(
      payload.prompts
        .filter((prompt) => prompt.slot === slot)
        .map(async (prompt) => ({
          id: prompt.id,
          kind: prompt.kind,
          html: await renderMarkdown(prompt.content, {}, { breaks: true }),
          buttonLabel: prompt.buttonLabel,
          buttonHref: prompt.buttonHref,
          dismissLabel: prompt.dismissLabel,
          threshold: prompt.threshold,
          priority: prompt.priority,
        })),
    );

    return { prompts, limits: payload.limits };
  } catch {
    return EMPTY;
  }
}
