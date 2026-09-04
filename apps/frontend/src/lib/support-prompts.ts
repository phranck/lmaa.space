import {
  SUPPORT_PROMPT_LIMIT_DEFAULTS,
  type SupportPrompt,
  type SupportPromptLimits,
  type SupportPromptSlot,
} from "@lmaa/contracts";

import { apiGet } from "@/lib/api";
import { renderMarkdownSSR } from "@/lib/markdown-ssr";

/**
 * The prompts a page hands to its island.
 *
 * The content is rendered to HTML here, on the server, through the same
 * pipeline as any other page text. That pipeline is `renderMarkdownSSR` rather
 * than the plain renderer: a prompt quotes what a check costs and what the year
 * costs, and only that one resolves those names and the media aliases. The
 * island only decides whether to show the result, because that decision needs
 * the reader's own history and that lives in their browser.
 */

/** One prompt, ready to be drawn. */
export interface RenderedSupportPrompt {
  id: string;
  /**
   * The internal name, carried for the analytics event alone.
   *
   * A visitor never sees it. Without it a report names prompts by their
   * identifier, which says nothing about which text or which place worked.
   */
  name: string;
  html: string;
  buttonLabel: string;
  buttonHref: string;
  buttonAlignment: SupportPrompt["buttonAlignment"];
  threshold: number;
  thresholdBasis: SupportPrompt["thresholdBasis"];
  priority: number;
}

/** What a slot needs to draw at most one prompt. */
export interface SupportPromptSlotData {
  prompts: RenderedSupportPrompt[];
  limits: SupportPromptLimits;
  /**
   * Whether every limit is set aside, which only ever happens outside
   * production. The backend decides it; the site only follows.
   */
  devAlwaysShow: boolean;
  /**
   * Every prompt that is live right now, across all slots.
   *
   * The reader's store holds a record per prompt and forgets the ones that no
   * longer exist. Deciding that from one slot's prompts alone would forget the
   * other slots' records, and somebody who dismissed a prompt on one page
   * would meet it again after visiting another.
   */
  liveIds: string[];
}

/** Nothing to show, which is also the answer when the backend is unreachable. */
const EMPTY: SupportPromptSlotData = {
  prompts: [],
  // From the schema rather than written out, so a limit added there is not
  // silently missing from the page that could not reach the backend.
  limits: SUPPORT_PROMPT_LIMIT_DEFAULTS,
  devAlwaysShow: false,
  liveIds: [],
};

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
    const payload = await apiGet<{
      prompts: SupportPrompt[];
      limits: SupportPromptLimits;
      devAlwaysShow?: boolean;
    }>("/support-prompts");

    // One pass over the payload: the ones for this slot are rendered, the rest
    // are passed over. Rendering runs together rather than one after another,
    // because no prompt's text depends on another's.
    const rendering: Promise<RenderedSupportPrompt>[] = [];
    for (const prompt of payload.prompts) {
      if (prompt.slot !== slot) continue;
      rendering.push(
        renderMarkdownSSR(prompt.content, { breaks: true }).then((html) => ({
          id: prompt.id,
          name: prompt.name,
          html,
          buttonLabel: prompt.buttonLabel,
          buttonHref: prompt.buttonHref,
          buttonAlignment: prompt.buttonAlignment,
          threshold: prompt.threshold,
          thresholdBasis: prompt.thresholdBasis,
          priority: prompt.priority,
        })),
      );
    }
    const prompts = await Promise.all(rendering);

    return {
      prompts,
      limits: payload.limits,
      devAlwaysShow: payload.devAlwaysShow ?? false,
      liveIds: payload.prompts.map((prompt) => prompt.id),
    };
  } catch {
    return EMPTY;
  }
}
