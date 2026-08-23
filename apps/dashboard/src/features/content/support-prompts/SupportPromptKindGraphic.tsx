import type { SupportPromptKind } from "@lmaa/contracts";

/**
 * A small picture of what a prompt looks like on the page.
 *
 * Drawn rather than taken from the icon set, because the question is not what
 * the thing is called but what shape it has, and no icon depicts a boxed
 * notice against a line between two rules. It uses `currentColor` throughout,
 * so it takes the colour of whatever it sits in, light or dark.
 */

interface SupportPromptKindGraphicProps {
  kind: SupportPromptKind;
  /** Edge length in pixels. The drawing keeps its 3:2 proportion. */
  width?: number;
}

/** How much of the canvas the drawing fills, in the proportion 48 by 32. */
const RATIO = 32 / 48;

export function SupportPromptKindGraphic({ kind, width = 88 }: SupportPromptKindGraphicProps) {
  const height = Math.round(width * RATIO);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 32"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {kind === "card" ? (
        <>
          {/* The card: a frame with two lines of text and a button in it. */}
          <rect
            x="3.5"
            y="3.5"
            width="41"
            height="25"
            rx="5.5"
            fill="currentColor"
            fillOpacity=".14"
            stroke="currentColor"
            strokeOpacity=".5"
          />
          <rect x="9" y="10" width="22" height="2.6" rx="1.3" fillOpacity=".8" />
          <rect x="9" y="15" width="15" height="2.6" rx="1.3" fillOpacity=".45" />
          <rect x="9" y="20.5" width="13" height="5" rx="2.5" fillOpacity=".8" />
        </>
      ) : (
        <>
          {/* The line: text between two rules, with no frame around it. */}
          <rect x="2" y="6" width="44" height="1.6" rx=".8" fillOpacity=".4" />
          <rect x="6" y="13" width="26" height="2.6" rx="1.3" fillOpacity=".8" />
          <rect x="6" y="18" width="17" height="2.6" rx="1.3" fillOpacity=".45" />
          <rect x="2" y="25" width="44" height="1.6" rx=".8" fillOpacity=".4" />
        </>
      )}
    </svg>
  );
}
