// The two islands that draw their content from the database rather than from
// the page. Only headings and wording stand in the shortcode; what is listed is
// maintained in the dashboard.

import { MARKDOWN_SHORTCODE_TOKENS } from "./tokens.js";
import type { MarkdownShortcodeDefinition } from "./types.js";

/** The searchable table of shops that did not make it in. */
export const REJECTED_SHOPS_TABLE_SHORTCODE = {
  token: MARKDOWN_SHORTCODE_TOKENS.rejectedShopsTable,
  renderMode: "island",
  target: "forbidden",
  placement: "block",
  label: "Abgelehnte Shops",
  description: "Zeigt die durchsuchbare Tabelle der abgelehnten Shops.",
  examples: ["[[rejected-shops-table]]"],
  params: [
    {
      name: "pageSize",
      aliases: ["defaultPageSize"],
      type: "enum",
      values: ["10", "15", "20", "30", "50", "all"],
      defaultValue: "15",
      label: "Zeilen pro Seite",
    },
    {
      name: "id",
      type: "string",
      label: "Eigene Kennung",
    },
  ],
} as const satisfies MarkdownShortcodeDefinition;

/** The people currently carrying the running costs. */
export const SPONSORS_SHORTCODE = {
  token: MARKDOWN_SHORTCODE_TOKENS.sponsors,
  renderMode: "island",
  target: "forbidden",
  placement: "block",
  label: "Jahres-Sponsoren",
  description:
    "Die Menschen, die gerade die laufenden Kosten tragen. Wer dort steht, pflegst du unter Sponsoring; hier stehen nur Überschrift und Text.",
  examples: [
    '[[sponsors title="Die aktuellen Jahres-Sponsoren" text="Danke an alle, die das hier tragen."]]',
    '[[sponsors title="Die aktuellen Jahres-Sponsoren" emptyAction="Der erste sein"]]',
  ],
  params: [
    { name: "title", type: "string", label: "Überschrift" },
    { name: "text", type: "string", aliases: ["description"], label: "Text darüber" },
    {
      name: "covered",
      type: "string",
      label: "Satz, wenn die Kosten gedeckt sind",
    },
    {
      name: "missing",
      type: "string",
      label: "Satz, solange etwas fehlt",
      placeholders: [
        { name: "missing", description: "den Betrag, der bis zu den Jahreskosten noch fehlt" },
      ],
    },
    {
      name: "empty",
      type: "string",
      label: "Text, solange noch niemand sponsert. Der erste Absatz wird zur Überschrift der Karte",
    },
    {
      name: "emptyAction",
      type: "string",
      label: "Beschriftung des Knopfes darunter",
    },
  ],
} as const satisfies MarkdownShortcodeDefinition;
