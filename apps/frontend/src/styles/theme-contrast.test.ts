import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/*
 * Holds every text and control pair of the site's two themes, Papier and
 * Salon, to WCAG AA. The values are read from the two stylesheets the site
 * ships, the shared token file and `global.css`, so a token that moves is
 * measured where it is stated rather than copied into this file.
 */

const frontendRoot = fileURLToPath(new URL("../../", import.meta.url));

/** WCAG AA for ordinary text. */
const TEXT = 4.5;
/** WCAG AA for the boundary of a control and for a focus indicator. */
const CONTROL_EDGE = 3;
/** The brightest photograph a page head can carry. */
const WHITE_PHOTOGRAPH = "#ffffff";

/** A colour as sRGB channels and alpha, each from 0 to 1. */
interface Rgba {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

/** The custom properties one theme resolves, by name. */
type Theme = Map<string, string>;

/**
 * One pair the themes must hold apart.
 *
 * @property foreground - The token the type or the edge is drawn in.
 * @property background - The token it stands on.
 * @property underlay - What shows through a translucent background: a token, a
 *   colour, or the page by default.
 * @property minimum - The contrast ratio the pair must reach.
 */
interface Pair {
  foreground: string;
  background: string;
  underlay?: string;
  minimum: number;
}

/**
 * The custom properties declared in every rule of a stylesheet whose
 * selector is exactly `selector`, later declarations replacing earlier ones
 * as the cascade does for one element.
 *
 * @param css - The stylesheet's text.
 * @param selector - The selector, such as `:root` or `html.dark`.
 */
function declarationsOf(css: string, selector: string): Theme {
  const declarations: Theme = new Map();
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, ruleSelector, body] of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (ruleSelector.trim() !== selector) continue;
    for (const declaration of body.split(";")) {
      const match = declaration.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
      if (match) declarations.set(match[1], match[2]);
    }
  }
  return declarations;
}

/**
 * Splits a function's arguments at the commas that are not inside a nested
 * function, so `color-mix(in srgb, var(--a) 12%, transparent)` gives three.
 *
 * @param text - The text between the function's parentheses.
 */
function splitArguments(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const character of text) {
    if (character === "(") depth++;
    if (character === ")") depth--;
    if (character === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  parts.push(current.trim());
  return parts;
}

/**
 * The inside of a function call that spans the whole text, or null.
 *
 * @param text - The value.
 * @param name - The function's name.
 */
function callArguments(text: string, name: string): string | null {
  return text.startsWith(`${name}(`) && text.endsWith(")") ? text.slice(name.length + 1, -1) : null;
}

/**
 * Converts OKLCH to sRGB, clamped into the gamut.
 *
 * @param lightness - L from 0 to 1.
 * @param chroma - C.
 * @param hue - H in degrees.
 */
function fromOklch(lightness: number, chroma: number, hue: number): [number, number, number] {
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const long = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const medium = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const short = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ];
  const encoded = linear.map((value) => {
    const clamped = Math.min(1, Math.max(0, value));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  });
  return [encoded[0], encoded[1], encoded[2]];
}

/**
 * Converts HSL to sRGB.
 *
 * @param hue - H in degrees.
 * @param saturation - S from 0 to 1.
 * @param lightness - L from 0 to 1.
 */
function fromHsl(hue: number, saturation: number, lightness: number): [number, number, number] {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const channel = (offset: number) => {
    const position = (offset + hue / 30) % 12;
    return lightness - (chroma / 2) * Math.max(-1, Math.min(position - 3, 9 - position, 1));
  };
  return [channel(0), channel(8), channel(4)];
}

/**
 * A number from a CSS component, reading a percentage against `percentOf`.
 *
 * @param text - The component, such as `86.9%` or `0.6`.
 * @param percentOf - What 100 % stands for.
 */
function amount(text: string, percentOf: number): number {
  return text.endsWith("%") ? (Number(text.slice(0, -1)) / 100) * percentOf : Number(text);
}

/**
 * Evaluates a colour value of the forms the two stylesheets use: hex, rgb,
 * hsl, oklch, `transparent`, `var()` and `color-mix(in srgb, …)`.
 *
 * @param value - The value as written.
 * @param theme - The custom properties `var()` resolves against.
 */
function evaluate(value: string, theme: Theme): Rgba {
  const text = value.trim();
  if (text === "transparent") return { red: 0, green: 0, blue: 0, alpha: 0 };
  const hex = text.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (hex) {
    const [red, green, blue] = [0, 2, 4].map(
      (offset) => parseInt(hex[1].slice(offset, offset + 2), 16) / 255,
    );
    return { red, green, blue, alpha: hex[2] ? parseInt(hex[2], 16) / 255 : 1 };
  }
  const variable = callArguments(text, "var");
  if (variable !== null) {
    const [name, fallback] = splitArguments(variable);
    const resolved = theme.get(name) ?? fallback;
    if (resolved === undefined) throw new Error(`${name} is not declared`);
    return evaluate(resolved, theme);
  }
  const mix = callArguments(text, "color-mix");
  if (mix !== null) {
    const [space, first, second] = splitArguments(mix);
    if (space !== "in srgb") throw new Error(`color-mix ${space} is not read here`);
    const part = (argument: string) => {
      const match = argument.match(/^(.*?)\s+([\d.]+)%$/);
      return match
        ? { color: evaluate(match[1], theme), share: Number(match[2]) / 100 }
        : { color: evaluate(argument, theme), share: null };
    };
    const one = part(first);
    const two = part(second);
    const shareOne = one.share ?? 1 - (two.share ?? 0.5);
    const shareTwo = two.share ?? 1 - shareOne;
    const alpha = one.color.alpha * shareOne + two.color.alpha * shareTwo;
    const channel = (key: "red" | "green" | "blue") =>
      alpha === 0
        ? 0
        : (one.color[key] * one.color.alpha * shareOne +
            two.color[key] * two.color.alpha * shareTwo) /
          alpha;
    return { red: channel("red"), green: channel("green"), blue: channel("blue"), alpha };
  }
  const spaced = (argumentsText: string) => {
    const [channels, alphaText] = argumentsText.split("/").map((part) => part.trim());
    return {
      channels: channels.split(/[\s,]+/),
      alpha: alphaText === undefined ? 1 : amount(alphaText, 1),
    };
  };
  const rgb = callArguments(text, "rgb");
  if (rgb !== null) {
    const { channels, alpha } = spaced(rgb);
    const [red, green, blue] = channels.map((channel) => amount(channel, 255) / 255);
    return { red, green, blue, alpha };
  }
  const hsl = callArguments(text, "hsl");
  if (hsl !== null) {
    const { channels, alpha } = spaced(hsl);
    const [red, green, blue] = fromHsl(
      Number(channels[0]),
      amount(channels[1], 1),
      amount(channels[2], 1),
    );
    return { red, green, blue, alpha };
  }
  const oklch = callArguments(text, "oklch");
  if (oklch !== null) {
    const { channels, alpha } = spaced(oklch);
    const [red, green, blue] = fromOklch(
      amount(channels[0], 1),
      Number(channels[1]),
      Number(channels[2]),
    );
    return { red, green, blue, alpha };
  }
  throw new Error(`${text} is not a colour this test reads`);
}

/**
 * Lays a translucent colour over an opaque one, as the browser paints it.
 *
 * @param top - The colour on top.
 * @param bottom - The opaque colour under it.
 */
function over(top: Rgba, bottom: Rgba): Rgba {
  const mix = (key: "red" | "green" | "blue") =>
    top[key] * top.alpha + bottom[key] * (1 - top.alpha);
  return { red: mix("red"), green: mix("green"), blue: mix("blue"), alpha: 1 };
}

/**
 * WCAG's relative luminance.
 *
 * @param color - An opaque colour.
 */
function luminance(color: Rgba): number {
  const linear = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(color.red) + 0.7152 * linear(color.green) + 0.0722 * linear(color.blue);
}

/**
 * The contrast ratio of a pair in one theme, translucent colours painted over
 * what shows through them.
 *
 * @param pair - The pair.
 * @param theme - The theme's custom properties.
 */
function contrastOf(pair: Pair, theme: Theme): number {
  const underlay = pair.underlay ?? "--ds-bg";
  const page = evaluate(underlay.startsWith("--") ? `var(${underlay})` : underlay, theme);
  const ground = over(evaluate(`var(${pair.background})`, theme), { ...page, alpha: 1 });
  const ink = over(evaluate(`var(${pair.foreground})`, theme), ground);
  const [lighter, darker] = [luminance(ink), luminance(ground)].sort(
    (first, second) => second - first,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

const tokens = readFileSync(
  resolve(frontendRoot, "../../packages/shared/styles/tokens.css"),
  "utf8",
);
const site = readFileSync(resolve(frontendRoot, "src/styles/global.css"), "utf8");
const papier: Theme = new Map([
  ...declarationsOf(tokens, ":root"),
  ...declarationsOf(site, ":root"),
]);
const salon: Theme = new Map([...papier, ...declarationsOf(site, "html.dark")]);

const surfaces = ["--ds-bg", "--ds-surface", "--ds-bg-elevated"];
const pairs: Pair[] = [
  ...["--ds-text", "--ds-text-muted", "--ds-text-subtle", "--ds-accent-text"].flatMap(
    (foreground) => surfaces.map((background) => ({ foreground, background, minimum: TEXT })),
  ),
  { foreground: "--ds-text-placeholder", background: "--ds-input-bg", minimum: TEXT },
  { foreground: "--ds-text", background: "--ds-header-bg", minimum: TEXT },
  { foreground: "--ds-cta-outline-text", background: "--ds-header-bg", minimum: TEXT },
  {
    foreground: "--ds-cta-outline-text",
    background: "--ds-cta-outline-hover-bg",
    underlay: "--ds-header-bg",
    minimum: TEXT,
  },
  { foreground: "--ds-accent-text", background: "--ds-accent-tint", minimum: TEXT },
  {
    foreground: "--ds-accent-text",
    background: "--ds-accent-tint",
    underlay: "--ds-surface",
    minimum: TEXT,
  },
  { foreground: "--ds-accent-text", background: "--ds-accent-subtle", minimum: TEXT },
  { foreground: "--ds-btn-filled-fg", background: "--ds-btn-filled-bg", minimum: TEXT },
  { foreground: "--ds-btn-filled-fg", background: "--ds-btn-filled-hover", minimum: TEXT },
  { foreground: "--ds-btn-primary-fg", background: "--ds-btn-primary-bg", minimum: TEXT },
  { foreground: "--ds-btn-primary-text", background: "--ds-surface", minimum: TEXT },
  {
    foreground: "--ds-btn-primary-text",
    background: "--ds-btn-primary-hover-bg",
    underlay: "--ds-surface",
    minimum: TEXT,
  },
  { foreground: "--ds-btn-neutral-text", background: "--ds-surface", minimum: TEXT },
  { foreground: "--ds-btn-neutral-text", background: "--ds-btn-neutral-hover-bg", minimum: TEXT },
  ...["success", "danger", "warning", "info"].flatMap((state) => [
    { foreground: `--ds-${state}-text`, background: `--ds-${state}-bg`, minimum: TEXT },
    { foreground: `--ds-${state}-text`, background: "--ds-surface", minimum: TEXT },
  ]),
  ...["success", "danger", "warning"].flatMap((state) => [
    { foreground: `--ds-btn-${state}-text`, background: "--ds-surface", minimum: TEXT },
    {
      foreground: `--ds-btn-${state}-text`,
      background: `--ds-btn-${state}-hover-bg`,
      underlay: "--ds-surface",
      minimum: TEXT,
    },
  ]),
  // A white photograph is the worst a veil has to carry type over.
  ...["--ds-photo-text", "--ds-photo-text-muted"].map((foreground) => ({
    foreground,
    background: "--ds-photo-veil",
    underlay: WHITE_PHOTOGRAPH,
    minimum: TEXT,
  })),
  ...["--ds-border-strong", "--ds-focus-ring"].flatMap((foreground) =>
    surfaces.map((background) => ({ foreground, background, minimum: CONTROL_EDGE })),
  ),
];

describe.each([
  ["Papier", papier],
  ["Salon", salon],
])("the %s theme", (_name, theme) => {
  it.each(
    pairs.map(
      (pair) =>
        [
          `${pair.foreground} on ${pair.background}${pair.underlay ? ` over ${pair.underlay}` : ""}`,
          pair,
        ] as const,
    ),
  )("holds %s to WCAG AA", (_label, pair) => {
    expect(contrastOf(pair, theme)).toBeGreaterThanOrEqual(pair.minimum);
  });
});
