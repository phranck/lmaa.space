import { HeartIcon, XCircleIcon } from "@phosphor-icons/react";
import { type CSSProperties, useEffect, useState } from "react";

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
  /**
   * Where the prompt sits, given by whatever holds it.
   *
   * A grid places its own cells, so the row it belongs in is the grid's to say
   * rather than this component's.
   */
  className?: string;
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

/**
 * How a prompt is drawn, decided by the slot rather than by the prompt.
 *
 * The place decides the form: a prompt among shop cards is a shop card, and one
 * among category cards is a category card. Each carries the geometry of the
 * cards around it and the accent tint instead of white, so it belongs to the
 * row without pretending to be one of its items.
 */
const CARD_SHAPES: Record<SlotName, { className: string; style: CSSProperties }> = {
  "my-shops": {
    className: "rounded-2xl p-2 sm:p-4",
    style: { background: "var(--ds-surface)", boxShadow: "var(--ds-shadow-md)" },
  },
  "category-grid": {
    className: "rounded-lg sm:rounded-2xl p-2 sm:p-4",
    style: { background: "var(--ds-surface)", boxShadow: "var(--ds-shadow-md)" },
  },
  // A shop page has no grid of its own, so the card takes the geometry every
  // other card on the site uses.
  "shop-detail": {
    className: "rounded-2xl",
    style: {
      background: "var(--ds-surface)",
      // No edge, and the shadow instead: the card stands off the page rather
      // than being drawn onto it, the same way the sponsor form does.
      boxShadow: "var(--ds-shadow-md)",
      padding: "var(--card-padding)",
    },
  },
};

/** Where the invitation stands, named as the stacks name it. */
const BUTTON_ROW_CLASSES: Record<RenderedSupportPrompt["buttonAlignment"], string> = {
  leading: "justify-start",
  center: "justify-center",
  trailing: "justify-end",
};

/**
 * How a prompt in this slot is drawn.
 *
 * The slot decides the geometry alone, so a prompt among shop cards is a shop
 * card and one among category cards is a category card. The light and the
 * accent tint are the same wherever it stands.
 */
function shapeFor(slot: SlotName) {
  const card = CARD_SHAPES[slot];
  return {
    className: `lmaa-card lmaa-accent-wash relative flex flex-col gap-3 ${card.className}`,
    style: card.style,
  };
}

export default function SupportPromptSlot({
  slot,
  prompts,
  limits,
  liveIds,
  devAlwaysShow,
  shopSlug,
  className,
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

    // Which counter a threshold reads is the prompt's own answer, because the
    // same place can carry a prompt about what somebody has kept and one about
    // what they have been reading.
    const likedShops = getLikedShopIds().size;
    const counters = { liked: likedShops, viewed: store.shopViews };
    const chosen = choosePrompt(prompts, store, limits, counters, Date.now(), devAlwaysShow);
    if (!chosen) return;

    const prompt = prompts.find((entry) => entry.id === chosen.id);
    if (!prompt) return;

    persist(recordShown(store, prompt.id, limits, Date.now()));
    setShown({ prompt, html: fillNumbers(prompt.html, likedShops, store.shopViews) });
    trackWebsiteEvent("support-prompt-shown", { prompt: prompt.id, slot });
  }, [prompts, limits, liveIds, devAlwaysShow, slot, shopSlug]);

  if (!shown) return null;
  const visible = shown.prompt;

  function close() {
    if (!shown) return;
    const store = parseStore(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY), liveIds);
    persist(recordDismissed(store, visible.id, Date.now()));
    trackWebsiteEvent("support-prompt-dismissed", { prompt: visible.id, slot });
    setShown(null);
  }

  function follow() {
    if (!shown) return;
    const store = parseStore(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY), liveIds);
    persist(recordResolved(store, visible.id));
    trackWebsiteEvent("support-prompt-clicked", { prompt: visible.id, slot });
  }

  const shape = shapeFor(slot);

  return (
    <aside
      data-support-prompt={visible.id}
      className={`${shape.className} ${className ?? ""}`}
      style={shape.style}
    >
      <button
        type="button"
        onClick={close}
        aria-label="Ausblenden"
        className="inline-flex size-7 items-center justify-center rounded-control opacity-50 transition-opacity hover:opacity-100"
        // Half the padding out, so it sits in the corner rather than in the
        // text's own column, and dimmed because it is a way out rather than
        // something to do.
        style={{
          // Stated here rather than as a class, because the accent wash puts
          // every direct child on `position: relative` and would win against
          // one.
          position: "absolute",
          top: "calc(var(--card-padding) / 2)",
          right: "calc(var(--card-padding) / 2)",
          color: "var(--ds-text-subtle)",
        }}
      >
        <XCircleIcon weight="duotone" className="size-5" />
      </button>

      <div
        className="lmaa-rich lmaa-prompt-copy pr-8 text-sm"
        style={{ color: "var(--ds-text-muted)" }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: page content, rendered and sanitised server-side by renderMarkdown, exactly as the ladder's prose is
        dangerouslySetInnerHTML={{ __html: shown.html }}
      />

      {/* It is the same invitation the sponsor wall carries, so the ask looks
          like one thing across the site rather than like two. Saying no is the
          cross in the corner, which every prompt carries whether or not it
          invites.

          Where it stands is the prompt's own choice, which departs from the
          rule that a button belonging to a card sits at that card's right edge.
          That rule is written for a card, a panel or a form, where a reader
          finishes at the bottom right. A prompt is a short piece of copy whose
          author decides how it sits, and an invitation under centred copy
          belongs under its middle. */}
      {visible.buttonLabel && (
        <div
          className={`flex flex-wrap items-center gap-3 ${BUTTON_ROW_CLASSES[visible.buttonAlignment]}`}
        >
          <a href={visible.buttonHref} onClick={follow} className="lmaa-invite-action is-compact">
            <HeartIcon weight="fill" className="size-4" aria-hidden="true" />
            {visible.buttonLabel}
          </a>
        </div>
      )}
    </aside>
  );
}
