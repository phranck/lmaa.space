export type MarkdownShortcodeRenderMode = "html" | "widget" | "island";

export type MarkdownShortcodeTargetRule = "required" | "optional" | "forbidden";

export type MarkdownShortcodePlacement = "inline" | "block";

export type MarkdownShortcodeParamType = "boolean" | "enum" | "integer" | "string";

export interface MarkdownShortcodeParamDefinition {
  name: string;
  type: MarkdownShortcodeParamType;
  aliases?: readonly string[];
  defaultValue?: boolean | number | string;
  /** Human name of the parameter, shown in the editor's reference. */
  label?: string;
  max?: number;
  min?: number;
  required?: boolean;
  values?: readonly string[];
}

export interface MarkdownShortcodeDefinition {
  token: string;
  renderMode: MarkdownShortcodeRenderMode;
  target: MarkdownShortcodeTargetRule;
  placement: MarkdownShortcodePlacement;
  examples: readonly string[];
  /** Human name of the shortcode, shown in the editor's reference. */
  label: string;
  /** What it does, in one or two sentences, shown beside the name. */
  description: string;
  params: readonly MarkdownShortcodeParamDefinition[];
  /**
   * Nodes that may appear inside this one.
   *
   * A child token is resolved against this list rather than against the
   * document's, so `option` means something inside `interval` and nothing at
   * the top level. A definition without children is a leaf, which is what every
   * shortcode was before nesting existed.
   */
  children?: readonly MarkdownShortcodeDefinition[];
}

/**
 * Every label the support ladder shows, with the wording it uses when the
 * shortcode says nothing.
 *
 * This object is the only place the defaults exist. The shortcode's parameter
 * list is derived from its keys further down, and the component merges an
 * override on top of it, so none of the three can drift from the others.
 *
 * `monthlyNote` carries the placeholder `{jahr}`, which is replaced with the
 * yearly total of the chosen amount. Showing that total is the one thing found
 * to reverse the reluctance to accept a recurring ask, so a replacement that
 * drops the placeholder loses the effect.
 */
export const SUPPORT_LADDER_LABEL_DEFAULTS = {
  frequencyGroup: "Wie oft",
  onceLabel: "Einmalig",
  monthlyLabel: "Monatlich",
  onceNote: "Einmalig ist vorausgewählt. Monatlich hilft mir am meisten, weil ich dann planen kann.",
  monthlyNote:
    "Das sind {jahr} im Jahr. Du richtest den Dauerauftrag selbst ein und kannst ihn jederzeit wieder beenden.",
  perMonth: "im Monat",
  qrAlt: "GiroCode zum Scannen",
  fieldName: "Empfänger",
  fieldIban: "IBAN",
  fieldBic: "BIC",
  fieldPurpose: "Verwendung",
  fieldAmount: "Betrag",
  amountOpen: "du entscheidest",
} as const satisfies Record<string, string>;

/** Token of every shortcode that may appear at the top level of a page. */
export const MARKDOWN_SHORTCODE_TOKENS = {
  widget: "widget",
  image: "image",
  pdf: "pdf",
  hls: "hls",
  youtube: "youtube",
  rejectedShopsTable: "rejected-shops-table",
  supportLadder: "support-ladder",
} as const;

/** Name of one overridable support-ladder label. */
export type SupportLadderLabelKey = keyof typeof SUPPORT_LADDER_LABEL_DEFAULTS;

/** Every overridable label name, in declaration order. */
export const SUPPORT_LADDER_LABEL_KEYS = Object.keys(
  SUPPORT_LADDER_LABEL_DEFAULTS,
) as SupportLadderLabelKey[];

/**
 * Parameter definitions for the label overrides, derived from the defaults so
 * a new label needs adding in one place only.
 */
const SUPPORT_LADDER_LABEL_PARAMS: readonly MarkdownShortcodeParamDefinition[] =
  SUPPORT_LADDER_LABEL_KEYS.map((name) => ({
    name,
    type: "string" as const,
    defaultValue: SUPPORT_LADDER_LABEL_DEFAULTS[name],
    label: name,
  }));

/**
 * Appearance of the GiroCode.
 *
 * It hangs off the variant it belongs to, which in practice is the one with
 * `key="once"`. EPC069-12 has no field for an interval, so a standing order
 * carries no code and a `qrcode` under its variant changes nothing.
 *
 * The accepted shape values are those the renderer declares, read from
 * `qr-code-styling`'s own `DotType`, `CornerSquareType` and `CornerDotType`.
 */
const SUPPORT_LADDER_QRCODE: MarkdownShortcodeDefinition = {
  token: "qrcode",
  renderMode: "island",
  target: "forbidden",
  placement: "inline",
  label: "GiroCode",
  description:
    "Aussehen des GiroCodes. Ohne diesen Knoten wird der Code in den Standardfarben gezeichnet.",
  examples: ['[[qrcode color="#292524" background="#ffffff" dots="rounded" size=176]]'],
  params: [
    { name: "color", type: "string", label: "Farbe der Punkte" },
    { name: "background", type: "string", label: "Hintergrundfarbe" },
    { name: "size", type: "integer", min: 96, max: 512, label: "Kantenlänge in Pixeln" },
    { name: "margin", type: "integer", min: 0, max: 64, label: "Rand in Pixeln" },
    {
      name: "dots",
      type: "enum",
      aliases: ["pixelType"],
      values: ["square", "dots", "rounded", "classy", "classy-rounded", "extra-rounded"],
      label: "Form der Punkte",
    },
    {
      name: "corners",
      type: "enum",
      values: ["square", "dot", "extra-rounded", "dots", "rounded", "classy", "classy-rounded"],
      label: "Form der Eckmarken",
    },
    { name: "image", type: "string", label: "Bild in der Mitte, als Pfad" },
  ],
};

/**
 * A short notice inside a payment block, drawn as a tinted sub-card.
 *
 * Used for the sort of thing a payer should read once before acting, such as
 * checking that their banking app shows the same details as the page.
 */
const SUPPORT_LADDER_INFO: MarkdownShortcodeDefinition = {
  token: "info",
  renderMode: "island",
  target: "forbidden",
  placement: "inline",
  label: "Hinweis",
  description:
    "Ein Hinweis als farbige Unterkarte, mit einem Symbol davor. Ohne diesen Knoten erscheint kein Hinweis.",
  examples: ['[[info text="Vergleich kurz, ob deine Banking-App dieselben Daten zeigt."]]'],
  params: [{ name: "text", type: "string", required: true, label: "Text des Hinweises" }],
};

/**
 * How a payment block presents itself for one interval.
 *
 * A bank account looks different depending on whether the visitor pays once or
 * sets up a standing order, and the two need different wording, so the copy
 * hangs off the block rather than off the interval.
 */
const SUPPORT_LADDER_VARIANT: MarkdownShortcodeDefinition = {
  token: "variant",
  renderMode: "island",
  target: "forbidden",
  placement: "inline",
  label: "Darstellung",
  description: "Überschrift und Text der Bankverbindung für ein Intervall. Bei once erscheint der GiroCode, bei monthly die Anleitung für den Dauerauftrag.",
  examples: ['[[variant key="once" title="Überweisung" text="Kommt ohne Umweg an."]]'],
  params: [
    { name: "key", type: "enum", values: ["once", "monthly"], required: true, label: "Intervall, once oder monthly" },
    { name: "title", type: "string", aliases: ["label"], label: "Überschrift" },
    { name: "text", type: "string", aliases: ["description"], label: "Beschreibender Text" },
    { name: "recommended", type: "boolean", label: "Hervorheben und vorauswählen" },
  ],
  children: [SUPPORT_LADDER_QRCODE, SUPPORT_LADDER_INFO],
};

/** One suggested amount, and what that amount pays for. */
const SUPPORT_LADDER_OPTION: MarkdownShortcodeDefinition = {
  token: "option",
  renderMode: "island",
  target: "forbidden",
  placement: "inline",
  label: "Betrag",
  description: "Ein vorgeschlagener Betrag und wofür er reicht. Mit recommended startet die Leiter darauf.",
  examples: ['[[option amount=15 text="Deckt einen ganzen Monat."]]'],
  params: [
    { name: "amount", type: "string", required: true, label: "Betrag in Euro" },
    // The author writes "description"; "text" is accepted so the vocabulary is
    // forgiving rather than a thing to look up.
    { name: "description", type: "string", aliases: ["text"], label: "Beschreibung" },
    // Marks the amount the ladder starts on. Without one the ladder falls back
    // to the second rung, which is low enough not to hide the cheapest option
    // and high enough not to anchor on it.
    { name: "recommended", type: "boolean", label: "Hervorheben und vorauswählen" },
  ],
};

/**
 * The free-amount field of an interval.
 *
 * Naming no `custom` node leaves the field out entirely, which is what an
 * interval wants when only the suggested amounts should be offered.
 */
const SUPPORT_LADDER_CUSTOM: MarkdownShortcodeDefinition = {
  token: "custom",
  renderMode: "island",
  target: "forbidden",
  placement: "inline",
  label: "Eigener Betrag",
  description: "Das Freifeld für einen selbst gewählten Betrag. Ohne diesen Knoten fehlt das Feld.",
  examples: ['[[custom label="Eigener Betrag" placeholder="25"]]'],
  params: [
    { name: "label", type: "string", aliases: ["title"], label: "Beschriftung" },
    // Anchors the empty field without preselecting anything, which is what the
    // amount-ladder evidence asks for.
    { name: "placeholder", type: "string", label: "Platzhalter im leeren Feld" },
  ],
};

/** The bank account, with its per-interval presentation. */
const SUPPORT_LADDER_BANK_ACCOUNT: MarkdownShortcodeDefinition = {
  token: "bankaccount",
  renderMode: "island",
  target: "forbidden",
  placement: "block",
  label: "Bankverbindung",
  description: "Empfänger und Kontodaten. Enthält je einen variant-Block pro Intervall.",
  examples: ['[[bankaccount name="Frank Gregor" iban="AT55 1900 1047 0466 6811"]]'],
  params: [
    { name: "name", type: "string", required: true, label: "Kontoinhaber" },
    { name: "iban", type: "string", required: true, label: "IBAN" },
    { name: "bic", type: "string", label: "BIC" },
    { name: "purpose", type: "string", label: "Verwendungszweck" },
  ],
  children: [SUPPORT_LADDER_VARIANT],
};

/** One frequency tab, with the amounts it offers. */
const SUPPORT_LADDER_INTERVAL: MarkdownShortcodeDefinition = {
  token: "interval",
  renderMode: "island",
  target: "forbidden",
  placement: "block",
  label: "Intervall",
  description: "Ein Reiter der Leiter, also einmalig oder monatlich, mit seinen Beträgen. Enthält option und custom.",
  examples: ['[[interval key="once" title="Einmalig" text="Einmalig ist vorausgewählt."]]'],
  params: [
    { name: "key", type: "enum", values: ["once", "monthly"], required: true, label: "Intervall, once oder monthly" },
    // The author writes "label" on an interval and "title" on a variant, so
    // both are accepted everywhere and neither has to be remembered.
    { name: "label", type: "string", aliases: ["title"], label: "Beschriftung" },
    { name: "text", type: "string", aliases: ["description"], label: "Beschreibender Text" },
  ],
  children: [SUPPORT_LADDER_OPTION, SUPPORT_LADDER_CUSTOM],
};

/** The PayPal.Me route. */
const SUPPORT_LADDER_PAYPAL: MarkdownShortcodeDefinition = {
  token: "paypalme",
  renderMode: "island",
  target: "forbidden",
  placement: "block",
  label: "PayPal",
  description: "Der PayPal.Me-Weg, nur bei einmaligen Zahlungen sichtbar.",
  examples: ['[[paypalme title="PayPal" url="https://www.paypal.com/paypalme/…"]]'],
  params: [
    { name: "url", type: "string", required: true, label: "Adresse" },
    { name: "title", type: "string", label: "Überschrift" },
    { name: "text", type: "string", label: "Beschreibender Text" },
    { name: "button", type: "string", label: "Beschriftung des Knopfes" },
  ],
};

/** Written out once, because it is both documentation and the editor's example. */
const SUPPORT_LADDER_EXAMPLE = [
  "[[support-ladder",
  "  [[bankaccount",
  '    name="Frank Gregor"',
  '    iban="AT55 1900 1047 0466 6811"',
  "    recommended",
  '    [[variant key="once"    title="Überweisung oder GiroCode" text="Kommt ohne Umweg an."]]',
  '    [[variant key="monthly" title="Dauerauftrag einrichten"   text="Läuft direkt zwischen den Banken."]]',
  "  ]]",
  '  [[interval key="once" title="Einmalig" text="Einmalig ist vorausgewählt."',
  '    [[option amount=15 text="Deckt einen ganzen Monat."]]',
  "  ]]",
  "]]",
].join("\n");

export const MARKDOWN_SHORTCODE_DEFINITIONS = [
  {
    token: MARKDOWN_SHORTCODE_TOKENS.widget,
    renderMode: "widget",
    target: "required",
    placement: "block",
    label: "Widget",
    description: "Bettet ein im Dashboard gepflegtes Widget als eigenständigen Rahmen ein.",
    examples: ["[[widget:key]]"],
    params: [
      {
        name: "title",
        type: "string",
        label: "Überschrift",
      },
      {
        name: "height",
        type: "integer",
        min: 40,
        max: 2400,
        defaultValue: 320,
        label: "Höhe in Pixeln",
      },
    ],
  },
  {
    token: MARKDOWN_SHORTCODE_TOKENS.image,
    renderMode: "html",
    target: "required",
    placement: "block",
    label: "Bild",
    description: "Zeigt ein hochgeladenes Bild, wahlweise mit Bildunterschrift und fester Grösse.",
    examples: ["[[image:/uploads/...]]"],
    params: [
      {
        name: "alt",
        type: "string",
        label: "Alternativtext",
      },
      {
        name: "caption",
        type: "string",
        label: "Bildunterschrift",
      },
      {
        name: "width",
        type: "integer",
        min: 1,
        max: 4096,
        label: "Breite in Pixeln",
      },
      {
        name: "height",
        type: "integer",
        min: 1,
        max: 4096,
        label: "Höhe in Pixeln",
      },
    ],
  },
  {
    token: MARKDOWN_SHORTCODE_TOKENS.pdf,
    renderMode: "html",
    target: "required",
    placement: "block",
    label: "PDF",
    description: "Verlinkt ein hochgeladenes PDF mit Vorschau.",
    examples: ["[[pdf:/uploads/...]]"],
    params: [
      {
        name: "label",
        type: "string",
        label: "Beschriftung",
      },
      {
        name: "title",
        type: "string",
        label: "Überschrift",
      },
    ],
  },
  {
    token: MARKDOWN_SHORTCODE_TOKENS.hls,
    renderMode: "html",
    target: "required",
    placement: "block",
    label: "Video",
    description: "Spielt ein Video aus dem eigenen Medienbestand ab.",
    examples: ["[[hls:alias]]"],
    params: [
      {
        name: "title",
        type: "string",
        label: "Überschrift",
      },
      {
        name: "caption",
        type: "string",
        label: "Bildunterschrift",
      },
      {
        name: "aspect",
        type: "string",
        label: "Seitenverhältnis",
      },
      {
        name: "poster",
        type: "string",
        label: "Vorschaubild",
      },
    ],
  },
  {
    token: MARKDOWN_SHORTCODE_TOKENS.youtube,
    renderMode: "html",
    target: "required",
    placement: "block",
    label: "YouTube",
    description: "Bettet ein YouTube-Video ein.",
    examples: ["[[youtube:url]]"],
    params: [
      {
        name: "title",
        type: "string",
        label: "Überschrift",
      },
      {
        name: "caption",
        type: "string",
        label: "Bildunterschrift",
      },
      {
        name: "aspect",
        type: "string",
        label: "Seitenverhältnis",
      },
    ],
  },
  {
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
  },
  {
    token: MARKDOWN_SHORTCODE_TOKENS.supportLadder,
    renderMode: "island",
    target: "forbidden",
    placement: "block",
    label: "Spenden-Leiter",
    description: "Der Spendenblock der Support-Seite: Beträge, Kontodaten, GiroCode und PayPal. Enthält bankaccount, interval und paypalme.",
    examples: [SUPPORT_LADDER_EXAMPLE],
    params: [
      // Every label the component shows that does not belong to a child node,
      // so the wording is content rather than code. Each falls back to
      // SUPPORT_LADDER_LABEL_DEFAULTS.
      ...SUPPORT_LADDER_LABEL_PARAMS,
    ],
    children: [SUPPORT_LADDER_BANK_ACCOUNT, SUPPORT_LADDER_INTERVAL, SUPPORT_LADDER_PAYPAL],
  },
] as const satisfies readonly MarkdownShortcodeDefinition[];

export type MarkdownShortcodeDefinitionToken =
  (typeof MARKDOWN_SHORTCODE_DEFINITIONS)[number]["token"];

export function getMarkdownShortcodeDefinition(
  token: string,
): MarkdownShortcodeDefinition | undefined {
  return MARKDOWN_SHORTCODE_DEFINITIONS.find((definition) => definition.token === token);
}

