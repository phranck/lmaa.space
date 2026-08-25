import { XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import type { SupportPromptSlot as SlotName } from "@lmaa/contracts";

import { trackWebsiteEvent } from "@/lib/analytics";
import { getLikedShopIds } from "@/lib/liked-shops";
import {
  choosePrompt,
  countShopView,
  parseStore,
  recordDismissed,
  recordResolved,
  recordShown,
  SUPPORT_PROMPT_STORAGE_KEY,
  type SupportPromptStore,
} from "@/lib/support-prompt-store";
import type { RenderedSupportPrompt, SupportPromptSlotData } from "@/lib/support-prompts";

/**
 * Draws at most one ask in one place on the page.
 *
 * Everything about whether to draw it lives in the reader's own browser, which
 * is why this is an island rather than part of the page: how many shops they
 * have kept, how often they have been asked, and when they last said not now.
 *
 * The prompt sits in the flow of the page. Nothing is dimmed, nothing is
 * covered, and the page stays usable whether or not the reader answers.
 */

interface SupportPromptSlotProps extends SupportPromptSlotData {
  /** Which place is asking, which decides what counts as progress. */
  slot: SlotName;
  /** The shop being looked at, on a shop page. */
  shopSlug?: string;
}

/** Writes the store back, ignoring a browser that refuses to store anything. */
function persist(store: SupportPromptStore): void {
  try {
    window.localStorage.setItem(SUPPORT_PROMPT_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // A reader who blocks storage sees the prompt again next time, which is a
    // better outcome than a page that fails.
  }
}

/**
 * Puts the reader's own numbers into the text.
 *
 * The placeholders are written by the same person who writes the prose, so they
 * are replaced after the Markdown has been rendered rather than before.
 */
function fillNumbers(html: string, likedShops: number, shopViews: number): string {
  return html.replaceAll("{shops}", String(likedShops)).replaceAll("{views}", String(shopViews));
}

export default function SupportPromptSlot({
  slot,
  prompts,
  limits,
  liveIds,
  shopSlug,
}: SupportPromptSlotProps) {
  // One piece of state, because the prompt and the text filled in for it are
  // decided together and shown together. Two would allow a render between the
  // two writes, showing one prompt's text under another's buttons.
  const [shown, setShown] = useState<{ prompt: RenderedSupportPrompt; html: string } | null>(null);

  useEffect(() => {
    if (prompts.length === 0) return;

    // One prompt per page view. A second slot on the same page stays quiet.
    if (document.querySelector("[data-support-prompt]")) return;

    let store = parseStore(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY), liveIds);

    if (slot === "shop-detail" && shopSlug) {
      store = countShopView(store, shopSlug);
      persist(store);
    }

    const likedShops = getLikedShopIds().size;
    const reached = slot === "shop-detail" ? store.shopViews : likedShops;
    const chosen = choosePrompt(prompts, store, limits, reached, Date.now());
    if (!chosen) return;

    const prompt = prompts.find((entry) => entry.id === chosen.id);
    if (!prompt) return;

    persist(recordShown(store, prompt.id, limits, Date.now()));
    setShown({ prompt, html: fillNumbers(prompt.html, likedShops, store.shopViews) });
    trackWebsiteEvent("support-prompt-shown", { prompt: prompt.id, slot });
  }, [prompts, limits, liveIds, slot, shopSlug]);

  if (!shown) return null;
  const visible = shown.prompt;

  function close(reason: "dismissed" | "resolved") {
    if (!shown) return;
    const store = parseStore(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY), liveIds);
    persist(
      reason === "resolved"
        ? recordResolved(store, visible.id)
        : recordDismissed(store, visible.id, Date.now()),
    );
    trackWebsiteEvent("support-prompt-dismissed", { prompt: visible.id, slot });
    setShown(null);
  }

  function follow() {
    if (!shown) return;
    const store = parseStore(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY), liveIds);
    persist(recordResolved(store, visible.id));
    trackWebsiteEvent("support-prompt-clicked", { prompt: visible.id, slot });
  }

  const isCard = visible.kind === "card";

  return (
    <aside
      data-support-prompt={visible.id}
      className={
        isCard
          ? "lmaa-card relative flex flex-col gap-3"
          : "relative flex flex-col gap-2 border-t border-b py-4"
      }
      style={
        isCard
          ? {
              border: "var(--card-border-width) solid var(--ds-accent)",
              padding: "var(--card-padding)",
              borderRadius: "var(--radius-card)",
              background: "var(--ds-accent-tint)",
            }
          : { borderColor: "var(--ds-border-subtle)" }
      }
    >
      <button
        type="button"
        onClick={() => close("dismissed")}
        aria-label="Ausblenden"
        className="absolute top-3 right-3 inline-flex size-7 items-center justify-center rounded-control"
        style={{ color: "var(--ds-text-subtle)" }}
      >
        <XIcon weight="bold" className="size-4" />
      </button>

      <div
        className="lmaa-rich pr-8 text-sm"
        style={{ color: "var(--ds-text-muted)" }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: page content, rendered and sanitised server-side by renderMarkdown, exactly as the ladder's prose is
        dangerouslySetInnerHTML={{ __html: shown.html }}
      />

      <div className="flex flex-wrap items-center gap-3">
        {visible.buttonLabel && (
          <a
            href={visible.buttonHref}
            onClick={follow}
            className="inline-flex h-9 items-center px-4 border text-sm font-semibold"
            style={{
              borderRadius: "var(--radius-card-inner)",
              borderColor: "var(--ds-border)",
              color: "var(--ds-text)",
            }}
          >
            {visible.buttonLabel}
          </a>
        )}
        {visible.dismissLabel && (
          <button
            type="button"
            onClick={() => close("resolved")}
            className="text-sm underline"
            style={{ color: "var(--ds-text-subtle)" }}
          >
            {visible.dismissLabel}
          </button>
        )}
      </div>
    </aside>
  );
}
