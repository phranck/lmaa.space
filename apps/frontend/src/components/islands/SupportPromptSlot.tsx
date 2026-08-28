import { HeartIcon, XCircleIcon } from "@phosphor-icons/react";
import { type CSSProperties, useEffect, useState } from "react";

import type { SupportPromptSlot as SlotName } from "@lmaa/contracts";

import { trackWebsiteEvent } from "@/lib/analytics";
import { getLikedShopIds } from "@/lib/liked-shops";
import { fillPromptNumbers } from "@/lib/prompt-numbers";
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
 * The geometry of a card on the public pages.
 *
 * A prompt stands between shop cards or category cards and has to be one of
 * them, so it takes their measure rather than the dashboard's. That measure is
 * `--public-card-padding` and `--public-card-radius`, which those cards read
 * themselves, so the two cannot drift apart.
 *
 * The padding is restated as `--card-padding` on the element itself, and the
 * nested radius with it, because a custom property holding a `var()` resolves
 * where it is declared. Without that the close control would place itself from
 * the root's padding, which this card does not use, and anything at the content
 * edge would round to the root's arithmetic.
 *
 * No edge, and the shadow instead: the card stands off the page rather than
 * being drawn onto it, the same way the sponsor form does.
 */
const CARD_STYLE = {
  background: "var(--ds-surface)",
  boxShadow: "var(--ds-shadow-md)",
  "--card-padding": "var(--public-card-padding)",
  // Rounder than the cards it stands between, on purpose. A prompt holds its
  // invitation in the corner of its content area, and at the cards' own radius
  // that corner derives to almost nothing. Stated once, with both nested radii
  // below reading it.
  "--prompt-radius": "24px",
  "--radius-card-inner": "max(calc(var(--prompt-radius) - var(--card-padding)), 0px)",
  borderRadius: "var(--prompt-radius)",
  padding: "var(--card-padding)",
} as CSSProperties;

const CARD_CLASS = "lmaa-card lmaa-accent-wash relative flex flex-col gap-3";

/**
 * How long the card takes to grow into place, matching `--ds-duration-base`.
 *
 * Stated here because the animation is handed to the browser as a keyframe
 * pair, which takes a number rather than a custom property.
 */
const REVEAL_MS = 200;

/** Where the invitation stands, named as the stacks name it. */
const BUTTON_ROW_CLASSES: Record<RenderedSupportPrompt["buttonAlignment"], string> = {
  leading: "justify-start",
  center: "justify-center",
  trailing: "justify-end",
};

/**
 * Grows the card into place as it is attached.
 *
 * A prompt cannot be decided on the server, because what decides it lives in
 * the reader's browser. It therefore arrives after the page has been laid out,
 * and whatever stands below it has to move. Growing the height turns that move
 * into one the eye can follow, and ordinary layout carries the rest: no row
 * below is animated, they simply follow.
 *
 * Written as a callback ref rather than an effect, because the element being
 * attached is exactly the moment to do this, and an effect watching the state
 * that produced it would be a second render for nothing.
 */
function revealCard(node: HTMLElement | null): void {
  if (!node) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const { height } = node.getBoundingClientRect();
  node.animate(
    [
      { height: "0px", opacity: 0, overflow: "hidden" },
      { height: `${height}px`, opacity: 1, overflow: "hidden" },
    ],
    { duration: REVEAL_MS, easing: "cubic-bezier(0, 0, 0.2, 1)" },
  );
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
    let store = parseStore(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY), liveIds);

    // Counted before anything can return, because the visit happened whether or
    // not this page has a prompt to show for it, and the counter is not this
    // slot's own: the prompt in the category grid measures its threshold
    // against the same number. Behind the guards, unpublishing the shop-detail
    // prompt froze that number and no prompt appeared anywhere again.
    // `countShopView` refuses the same shop twice, so standing ahead of the
    // second guard cannot count a page twice either.
    if (slot === "shop-detail" && shopSlug) {
      store = countShopView(store, shopSlug);
      persist(store);
    }

    if (prompts.length === 0) return;

    // One prompt per page view. A second slot on the same page stays quiet.
    if (document.querySelector("[data-support-prompt]")) return;

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
    setShown({
      prompt,
      html: fillPromptNumbers(prompt.html, { likedShops, shopViews: store.shopViews }),
    });
    trackWebsiteEvent("support-prompt-shown", { prompt: prompt.name, id: prompt.id, slot });
  }, [prompts, limits, liveIds, devAlwaysShow, slot, shopSlug]);


  if (!shown) return null;
  const visible = shown.prompt;

  function close() {
    if (!shown) return;
    const store = parseStore(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY), liveIds);
    persist(recordDismissed(store, visible.id, limits, Date.now()));
    trackWebsiteEvent("support-prompt-dismissed", {
      prompt: visible.name,
      id: visible.id,
      slot,
    });
    setShown(null);
  }

  function follow() {
    if (!shown) return;
    const store = parseStore(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY), liveIds);
    persist(recordResolved(store, visible.id));
    // Where it led as well as which prompt it was: with more than one
    // destination in play, the two questions have different answers.
    trackWebsiteEvent("support-prompt-clicked", {
      prompt: visible.name,
      id: visible.id,
      slot,
      href: visible.buttonHref,
      label: visible.buttonLabel,
    });
  }

  return (
    <aside
      ref={revealCard}
      data-support-prompt={visible.id}
      className={`${CARD_CLASS} ${className ?? ""}`}
      style={CARD_STYLE}
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
          // A nested corner is the card's radius less the distance to it, and
          // this control sits at half the padding rather than at all of it.
          borderRadius: "max(calc(var(--prompt-radius) - var(--card-padding) / 2), 0px)",
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
          <a
            href={visible.buttonHref}
            onClick={follow}
            className="lmaa-invite-action is-compact"
            // It occupies the corner of the content area, so it takes the
            // card's radius less the padding rather than a control's own. That
            // is what keeps the gap between the two curves even.
            style={{ borderRadius: "var(--radius-card-inner)" }}
          >
            <HeartIcon weight="fill" className="size-4" aria-hidden="true" />
            {visible.buttonLabel}
          </a>
        </div>
      )}
    </aside>
  );
}
