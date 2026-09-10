import { MARKDOWN_SHORTCODE_TOKENS } from "./tokens.js";
import type { MarkdownShortcodeDefinition } from "./types.js";

/**
 * The edge length an icon takes when the author names none.
 *
 * Stated here rather than in the renderer, so the reference and the page cannot
 * disagree about what a plain `[[icon]]` measures.
 */
export const ICON_DEFAULT_SIZE = 24;

/**
 * The custom property carrying the gap between the children of a stack.
 *
 * The value itself lives in the stylesheet, where the page's spacing is
 * decided. Naming the property rather than the figure is what keeps this from
 * becoming a second answer that drifts.
 */
export const STACK_DEFAULT_SPACING_TOKEN = "var(--ds-space-sm)";

/** Written out once, because it is both documentation and the editor's example. */
const STACK_EXAMPLE = [
  '[[vstack alignment="leading" spacing=12 {',
  "## Was du bekommst",
  "",
  "Ganz gewöhnliches **Markdown**, und alles andere auch.",
  "",
  '[[hstack alignment="center" spacing=8 {',
  '[[icon name="heart" size=24]]',
  "Ein Symbol und sein Text, nebeneinander.",
  "}]]",
  "}]]",
].join("\n");

/** A Phosphor symbol in the running text, with its optional caption. */
export const ICON_SHORTCODE = {
  token: MARKDOWN_SHORTCODE_TOKENS.icon,
  renderMode: "html",
  target: "forbidden",
  placement: "inline",
  label: "Symbol",
  description:
    "Ein Phosphor-Symbol im Text, immer in der Duotone-Variante. Der Name ist der, den Phosphor veröffentlicht, also etwa x-circle. alignment stellt das Symbol, textalignment den Text: mit text ist das die Beschriftung daneben, ohne text der folgende Absatz, der um das Symbol herumfließt.",
  examples: [
    '[[icon name="x-circle" size=96]]',
    '[[icon name="atom" size=96 alignment="center"]]',
    '[[icon name="heart" size=96 text="## Danke für deine Hilfe!" textalignment="trailing"]]',
    '[[icon name="heart" size=96 textalignment="trailing"]]',
  ],
  params: [
    {
      name: "name",
      type: "string",
      label: "Name des Symbols, wie Phosphor ihn schreibt",
    },
    {
      name: "size",
      type: "integer",
      defaultValue: ICON_DEFAULT_SIZE,
      label: "Kantenlänge in Pixeln",
    },
    {
      name: "color",
      type: "string",
      defaultLabel: "die Farbe des Textes",
      label: "Farbe, als Hexwert mit oder ohne #, als Farbname oder als var(--token)",
    },
    {
      // Where the symbol stands. Kept apart from textalignment, which is only
      // ever about the text, so centring a symbol that carries no text does
      // not mean reaching for the text's alignment to do it.
      name: "alignment",
      type: "enum",
      values: ["leading", "center", "trailing"],
      defaultLabel: "dort, wo der Shortcode im Text steht",
      label: "Wo das Symbol selbst steht",
    },
    {
      name: "text",
      type: "string",
      defaultLabel: "keine Beschriftung, der folgende Absatz fließt um das Symbol",
      label: "Beschriftung neben dem Symbol, als Markdown. Überschriften und Absätze sind erlaubt",
    },
    {
      // The names are SwiftUI's, and so are the spellings. The renderer also
      // reads them with a leading dot, in lower case and with a hyphen, so
      // ".topLeading", "topleading" and "top-leading" all arrive as the same
      // alignment.
      name: "textalignment",
      aliases: ["textAlignment", "text-alignment"],
      type: "enum",
      values: [
        "top",
        "bottom",
        "leading",
        "trailing",
        "center",
        "topLeading",
        "topTrailing",
        "bottomLeading",
        "bottomTrailing",
      ],
      defaultLabel: "mit text wie trailing, ohne text kein Umfluss",
      label:
        "Wo der Text sitzt, benannt wie in SwiftUI. Gemeint ist immer der Text, nicht das Symbol: trailing setzt ihn rechts, das Symbol steht dann links",
    },
  ],
  tables: [
    {
      caption: "alignment: wo das Symbol steht",
      columns: ["alignment", "Symbol"],
      rows: [
        ["leading", "am linken Rand"],
        ["center", "mittig"],
        ["trailing", "am rechten Rand"],
        ["ohne Angabe", "dort, wo der Shortcode im Text steht"],
      ],
    },
    {
      caption: "textalignment mit text: die Beschriftung am Symbol",
      columns: ["textalignment", "Text steht", "quer dazu"],
      rows: [
        ["trailing", "rechts, Symbol links", "vertikal mittig"],
        ["leading", "links, Symbol rechts", "vertikal mittig"],
        ["topTrailing", "rechts, Symbol links", "oben bündig"],
        ["topLeading", "links, Symbol rechts", "oben bündig"],
        ["bottomTrailing", "rechts, Symbol links", "unten bündig"],
        ["bottomLeading", "links, Symbol rechts", "unten bündig"],
        ["top", "darüber, Symbol darunter", "horizontal zentriert"],
        ["bottom", "darunter, Symbol darüber", "horizontal zentriert"],
        ["center", "über der Mitte des Symbols", "beide übereinander"],
        ["ohne Angabe", "wie trailing", "vertikal mittig"],
      ],
    },
    {
      caption: "textalignment ohne text: der folgende Absatz fließt um das Symbol",
      columns: ["textalignment", "Symbol", "Absatz"],
      rows: [
        ["trailing, topTrailing, bottomTrailing", "links", "fließt rechts daneben"],
        ["leading, topLeading, bottomLeading", "rechts", "fließt links daneben"],
        ["top, bottom, center", "kein Umfluss, alignment entscheidet", "steht darunter"],
        ["ohne Angabe", "im Textfluss", "läuft weiter"],
      ],
    },
  ],
} as const satisfies MarkdownShortcodeDefinition;

/** A container stacking its children downwards, as SwiftUI's VStack does. */
export const VSTACK_SHORTCODE = {
  token: MARKDOWN_SHORTCODE_TOKENS.vstack,
  renderMode: "html",
  target: "forbidden",
  placement: "block",
  body: "markdown",
  label: "VStack",
  description:
    "Stellt seinen Inhalt untereinander, wie der VStack in SwiftUI. Was zwischen den geschweiften Klammern steht, ist gewöhnliches Markdown: Überschriften, Absätze, Bilder, jeder andere Shortcode und auch ein weiterer Stack. alignment stellt die Kinder waagrecht und richtet zugleich den Text in ihnen aus, spacing setzt den Abstand dazwischen in Pixeln.",
  examples: [STACK_EXAMPLE],
  params: [
    {
      name: "alignment",
      type: "enum",
      values: ["leading", "center", "trailing"],
      defaultValue: "leading",
      label: "Wo die Kinder waagrecht stehen. Richtet auch den Text darin aus",
    },
    {
      name: "spacing",
      type: "integer",
      min: 0,
      max: 200,
      defaultLabel: STACK_DEFAULT_SPACING_TOKEN,
      label: "Abstand zwischen den Kindern in Pixeln",
    },
  ],
  tables: [
    {
      caption: "alignment: wo die Kinder eines VStack stehen",
      columns: ["alignment", "Kinder stehen", "Text darin"],
      rows: [
        ["leading", "am linken Rand", "linksbündig"],
        ["center", "mittig", "zentriert"],
        ["trailing", "am rechten Rand", "rechtsbündig"],
      ],
    },
  ],
} as const satisfies MarkdownShortcodeDefinition;

/** A container stacking its children sideways, as SwiftUI's HStack does. */
export const HSTACK_SHORTCODE = {
  token: MARKDOWN_SHORTCODE_TOKENS.hstack,
  renderMode: "html",
  target: "forbidden",
  placement: "block",
  body: "markdown",
  label: "HStack",
  description:
    "Stellt seinen Inhalt nebeneinander, wie der HStack in SwiftUI. Der Inhalt ist derselbe wie beim VStack, also Markdown samt Shortcodes und weiteren Stacks. Jeder Absatz und jedes Element wird zu einer Spalte. Wird es zu eng, rutschen die Spalten in die nächste Zeile, statt aus der Seite zu laufen.",
  examples: [
    '[[hstack alignment="center" spacing=16 {\n[[icon name="heart" size=32]]\nEin Symbol und sein Text.\n}]]',
  ],
  params: [
    {
      name: "alignment",
      type: "enum",
      values: ["top", "center", "bottom", "firstTextBaseline"],
      defaultValue: "center",
      label: "Wo die Kinder senkrecht stehen",
    },
    {
      name: "spacing",
      type: "integer",
      min: 0,
      max: 200,
      defaultLabel: STACK_DEFAULT_SPACING_TOKEN,
      label: "Abstand zwischen den Kindern in Pixeln",
    },
  ],
  tables: [
    {
      caption: "alignment: wo die Kinder eines HStack stehen",
      columns: ["alignment", "Kinder stehen"],
      rows: [
        ["top", "oben bündig"],
        ["center", "senkrecht mittig"],
        ["bottom", "unten bündig"],
        ["firstTextBaseline", "auf der Grundlinie ihrer ersten Zeile"],
      ],
    },
  ],
} as const satisfies MarkdownShortcodeDefinition;

/** A gap between two elements of a stack, as SwiftUI's Spacer is. */
export const SPACER_SHORTCODE = {
  token: MARKDOWN_SHORTCODE_TOKENS.spacer,
  renderMode: "html",
  target: "forbidden",
  placement: "block",
  label: "Spacer",
  description:
    "Ein Abstand, wie der Spacer in SwiftUI. Mit size ist er genau so gross, ohne size nimmt er den Platz, der übrig ist: im HStack schiebt er die Nachbarn auseinander, im VStack ohne eigene Höhe tut er nichts. Nützlich, wenn an einer Stelle mehr Luft soll als das spacing des Stacks hergibt.",
  examples: ["[[spacer size=24]]", "[[hstack {\nlinks\n[[spacer]]\nrechts\n}]]"],
  params: [
    {
      name: "size",
      type: "integer",
      min: 0,
      max: 400,
      defaultLabel: "so viel Platz, wie übrig ist",
      label: "Höhe oder Breite in Pixeln, je nach Richtung des Stacks",
    },
  ],
} as const satisfies MarkdownShortcodeDefinition;
