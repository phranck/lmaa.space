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
 * The labels the support ladder shows that belong to no child node.
 *
 * Anything an `interval`, a `variant`, an `option`, a `custom` or an `info`
 * node owns is written on that node instead. What is left here are the few
 * words the component itself puts on screen, each with the wording it uses when
 * the shortcode says nothing.
 *
 * The parameter list of the shortcode is derived from these entries, so a new
 * label is added in one place.
 */
export const SUPPORT_LADDER_LABELS = {
  frequencyGroup: { value: "Wie oft", label: "Vorlesbarer Name der Intervall-Auswahl" },
  perMonth: { value: "im Monat", label: "Zusatz hinter einem monatlichen Betrag" },
  qrAlt: { value: "GiroCode zum Scannen", label: "Vorlesbarer Name des GiroCodes" },
  fieldName: { value: "Empfänger", label: "Beschriftung der Zeile Empfänger" },
  fieldIban: { value: "IBAN", label: "Beschriftung der Zeile IBAN" },
  fieldBic: { value: "BIC", label: "Beschriftung der Zeile BIC" },
  fieldPurpose: { value: "Verwendung", label: "Beschriftung der Zeile Verwendungszweck" },
  fieldAmount: { value: "Betrag", label: "Beschriftung der Zeile Betrag" },
  amountOpen: { value: "du entscheidest", label: "Text, wenn kein Betrag gewählt ist" },
} as const satisfies Record<string, { value: string; label: string }>;

/** Name of one overridable support-ladder label. */
export type SupportLadderLabelKey = keyof typeof SUPPORT_LADDER_LABELS;

/** Every overridable label name, in declaration order. */
export const SUPPORT_LADDER_LABEL_KEYS = Object.keys(
  SUPPORT_LADDER_LABELS,
) as SupportLadderLabelKey[];

/** The wording used when the shortcode names no override. */
export const SUPPORT_LADDER_LABEL_DEFAULTS = Object.fromEntries(
  SUPPORT_LADDER_LABEL_KEYS.map((key) => [key, SUPPORT_LADDER_LABELS[key].value]),
) as Record<SupportLadderLabelKey, string>;

const SUPPORT_LADDER_LABEL_PARAMS: readonly MarkdownShortcodeParamDefinition[] =
  SUPPORT_LADDER_LABEL_KEYS.map((name) => ({
    name,
    type: "string" as const,
    defaultValue: SUPPORT_LADDER_LABELS[name].value,
    label: SUPPORT_LADDER_LABELS[name].label,
  }));

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
    // Marke aus der Zahlungsmethoden-Sammlung, dieselbe wie auf den
    // Shop-Detailseiten, oder "github" für das GitHub-Zeichen.
    { name: "icon", type: "string", label: "Symbol, z. B. sepa, paypal, klarna, github" },
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
    { name: "text", type: "string", label: "Erklärung unter dem Feld" },
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

/**
 * The GitHub Sponsors route.
 *
 * Unlike the PayPal route this shows for every interval, because Sponsors is
 * the one way on the page that carries a real monthly subscription: the sponsor
 * starts and ends it themselves, and GitHub takes no fee on a sponsorship from
 * a private person.
 */
const SUPPORT_LADDER_SPONSORS: MarkdownShortcodeDefinition = {
  token: "ghsponsor",
  renderMode: "island",
  target: "forbidden",
  placement: "block",
  label: "GitHub Sponsors",
  description:
    "Der Weg über GitHub Sponsors. Erscheint bei jedem Intervall, weil er als einziger ein echtes Monats-Abo kann.",
  examples: ['[[ghsponsor title="GitHub Sponsors" url="https://github.com/sponsors/phranck"]]'],
  params: [
    { name: "url", type: "string", required: true, label: "Adresse" },
    { name: "title", type: "string", label: "Überschrift" },
    { name: "text", type: "string", aliases: ["description"], label: "Beschreibender Text" },
    { name: "button", type: "string", label: "Beschriftung des Knopfes" },
    // Marke aus der Zahlungsmethoden-Sammlung, dieselbe wie auf den
    // Shop-Detailseiten, oder "github" für das GitHub-Zeichen.
    { name: "icon", type: "string", label: "Symbol, z. B. sepa, paypal, klarna, github" },
  ],
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
    // Marke aus der Zahlungsmethoden-Sammlung, dieselbe wie auf den
    // Shop-Detailseiten, oder "github" für das GitHub-Zeichen.
    { name: "icon", type: "string", label: "Symbol, z. B. sepa, paypal, klarna, github" },
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
    children: [
      SUPPORT_LADDER_BANK_ACCOUNT,
      SUPPORT_LADDER_INTERVAL,
      SUPPORT_LADDER_PAYPAL,
      SUPPORT_LADDER_SPONSORS,
    ],
  },
] as const satisfies readonly MarkdownShortcodeDefinition[];

export type MarkdownShortcodeDefinitionToken =
  (typeof MARKDOWN_SHORTCODE_DEFINITIONS)[number]["token"];

export function getMarkdownShortcodeDefinition(
  token: string,
): MarkdownShortcodeDefinition | undefined {
  return MARKDOWN_SHORTCODE_DEFINITIONS.find((definition) => definition.token === token);
}

