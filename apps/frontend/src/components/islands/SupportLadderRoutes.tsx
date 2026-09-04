/**
 * The routes out of the support page, and the brand marks beside them.
 *
 * Lifted out of the island because they answer their own question: what a
 * payment route looks like and how its logo is fitted. Nothing here reads the
 * ladder's state.
 */

import { ArrowSquareOutIcon } from "@phosphor-icons/react";

import { PAYMENT_METHOD_MAP } from "@lmaa/ui";

import githubLockupUrl from "@/assets/brands/github-lockup.svg?url";
import paypalLockupUrl from "@/assets/brands/paypal-lockup.svg?url";
import sepaLockupUrl from "@/assets/brands/sepa-lockup.svg?url";
import { NoticeCard } from "@/components/NoticeCard";
import type { SupportLadderRoute } from "@/lib/content-shortcode-segments";

import { RichText } from "./SupportLadderAmounts.tsx";

/**
 * Width of a brand mark beside a block heading, in pixels.
 *
 * The collection draws every logo on a 3:2 card, so the height follows from the
 * width rather than being chosen.
 */
const ROUTE_ICON_PX = 72;

/**
 * Width of a brand lockup, in pixels.
 *
 * A lockup carries the word beside the mark, so it is wider than a payment
 * logo whilst the mark inside it comes out at about that logo's height. The
 * height follows from the file, so each brand keeps its own proportions and
 * every lockup ends at the same edge.
 */
const BRAND_MARK_PX = 102;

/**
 * The logos a brand publishes itself, each taken from that brand's own pack.
 *
 * They are used where a block is that brand's route out of the page, which is
 * what the trademark holders permit their marks to be used for.
 */
const BRAND_MARKS: Record<string, { url: string; width: number }> = {
  github: { url: githubLockupUrl, width: BRAND_MARK_PX },
  sepa: { url: sepaLockupUrl, width: BRAND_MARK_PX },
  // PayPal draws its lockup without the margin GitHub builds into theirs, so it
  // is set two pixels narrower to carry the same weight beside it.
  paypal: { url: paypalLockupUrl, width: BRAND_MARK_PX - 2 },
};

/**
 * The brand mark of a payment route.
 *
 * Marks come from the same collection the shop detail pages use, so a PayPal
 * logo looks here exactly as it looks there. GitHub is the one exception and
 * takes Phosphor's mark, because the collection holds payment methods only. It
 * is drawn on the same card so the three sit together as one set.
 *
 * The collection greys its logos in their resting state and shows full colour
 * only on hover, which suits a row of many. Here each block carries a single
 * mark, so the filter is switched off and the brand colours stand.
 *
 * An unknown name draws nothing rather than a placeholder, so a typo in the
 * page content costs the mark and not the block.
 */
/** Frames allowed for a drawing to appear before the trim gives up. */
export const TRIM_ATTEMPTS = 30;

/**
 * Makes the drawn code fill its box.
 *
 * The renderer fits whole pixels per module, so a canvas that is not an exact
 * multiple of the module count keeps the remainder as padding and centres the
 * code inside it. That padding reads as a margin nobody asked for, and it
 * changes with the data, because the amount decides how many modules there are.
 *
 * The fix crops rather than deletes, because the modules are drawn as clipping
 * masks that a full-size rectangle is poured through. Deleting anything there
 * takes the code with it.
 *
 * What is measured are the three finder patterns, the squares a scanner looks
 * for. Every QR code carries them flush with its corners, so their extent is
 * the code's extent, and that extent becomes the `viewBox`.
 *
 * @param node - The element the renderer drew into.
 * @returns `true` once a drawing was found and cropped, `false` whilst there is
 *   nothing to crop yet.
 */
export function fitSvgToDrawing(node: HTMLElement): boolean {
  const svg = node.querySelector("svg");
  if (!svg) return false;

  const canvas = Number(svg.getAttribute("width"));
  if (!canvas) return false;

  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const shape of Array.from(svg.querySelectorAll<SVGRectElement>(":scope > rect"))) {
    const width = shape.width.baseVal.value;
    const height = shape.height.baseVal.value;
    // The layers that carry the modules span the whole canvas and say nothing
    // about where the code sits. The finder patterns are the ones that do.
    if (width >= canvas || height >= canvas) continue;

    const x = shape.x.baseVal.value;
    const y = shape.y.baseVal.value;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + width);
    bottom = Math.max(bottom, y + height);
  }

  if (!Number.isFinite(left) || right <= left || bottom <= top) return false;

  svg.setAttribute("viewBox", `${left} ${top} ${right - left} ${bottom - top}`);
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  return true;
}

export function RouteIcon({ name }: { name?: string }) {
  if (!name) return null;

  const lockup = BRAND_MARKS[name];
  if (lockup) {
    return (
      <img
        src={lockup.url}
        alt=""
        aria-hidden="true"
        className="shrink-0"
        style={{ width: lockup.width, height: "auto" }}
      />
    );
  }

  const definition = PAYMENT_METHOD_MAP.get(name as never);
  if (!definition) return null;

  const Mark = definition.icon;
  return (
    <span className="lmaa-route-icon inline-flex shrink-0">
      <Mark aria-hidden={true} size={ROUTE_ICON_PX} />
    </span>
  );
}

/**
 * An outgoing payment route, drawn as a card with a link.
 *
 * PayPal and GitHub Sponsors look the same and differ only in when the ladder
 * shows them, so they share this rather than each carrying a copy.
 */
export function OutboundRoute({ route }: { route: SupportLadderRoute }) {
  return (
    <div
      className="lmaa-card lmaa-payment-card mt-3"
      style={
        {
          padding: "var(--card-padding)",
          borderRadius: "var(--radius-card)",
          backgroundColor: "var(--ds-surface)",
          "--payment-brand": route.icon ? `var(--brand-${route.icon}, transparent)` : "transparent",
        } as React.CSSProperties
      }
    >
      <div className="lmaa-card-head flex items-start justify-between gap-4">
        <h3
          className="font-semibold"
          style={{
            fontFamily: "var(--ds-font-serif)",
            fontSize: "var(--ds-text-lg)",
            lineHeight: "var(--ds-leading-lg)",
          }}
        >
          {route.title}
        </h3>
        <RouteIcon name={route.icon} />
      </div>
      {route.text && (
        <RichText
          html={route.text}
          className="mt-1 text-sm"
          style={{ color: "var(--ds-text-muted)" }}
        />
      )}
      {/* Zwischen Text und Knopf: gelesen, sobald klar ist worum es geht, und
          bevor jemand klickt. Ohne `inset`, weil die Notiz in einer Karte sitzt
          und deshalb den inneren Radius nimmt. */}
      {route.hint && (
        <NoticeCard className="mt-3">
          <RichText html={route.hint} />
        </NoticeCard>
      )}
      <a
        href={route.url}
        rel="noopener noreferrer"
        target="_blank"
        className="mt-6 ml-auto flex w-fit items-center gap-2 h-9 px-4 text-sm font-semibold transition-colors"
        style={{
          borderRadius: "var(--radius-card-inner)",
          // The accent draws the line, the wash behind it only lifts the button
          // off the card. Filled with the accent itself it would shout, and the
          // text on it would need a colour of its own to stay readable.
          border: "var(--card-border-width) solid var(--ds-accent)",
          background: "var(--ds-accent-tint)",
          // The accent's own colour, two steps darker than the line: the line
          // itself measures 2.01:1 on this wash, this shade measures 6.12:1.
          color: "var(--ds-accent-text)",
        }}
      >
        {route.button}
        <ArrowSquareOutIcon weight="duotone" aria-hidden="true" className="size-4" />
      </a>
    </div>
  );
}
