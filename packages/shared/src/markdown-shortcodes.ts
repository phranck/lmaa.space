export type MarkdownShortcodeRenderMode = "html" | "island";

export type MarkdownShortcodeTargetRule = "required" | "optional" | "forbidden";

export type MarkdownShortcodePlacement = "inline" | "block";

/**
 * Whether a shortcode carries content between braces.
 *
 * `markdown` is a container: what stands inside it is page content and is
 * rendered exactly as the page around it, so any shortcode and any markup may
 * stand there, including another container. `forbidden` is everything else,
 * which draws one thing from its attributes alone.
 */
export type MarkdownShortcodeBodyRule = "forbidden" | "markdown";

export type MarkdownShortcodeParamType = "boolean" | "enum" | "integer" | "string";

/**
 * A name in braces that one attribute's value accepts, and nothing else does.
 *
 * Three kinds of `{name}` are written in this project and they look identical
 * to whoever is typing. A site variable works in any text and is expanded
 * before the page is parsed. A text token works in a form field and nowhere
 * else. This is the third: a name that means something inside one attribute of
 * one shortcode, substituted by that shortcode's own renderer against a figure
 * only it holds.
 *
 * Declared here rather than described in the attribute's label, so the
 * reference panel can render it the way it renders everything else instead of
 * hiding it in a sentence somebody has to open the shortcode to read.
 */
export interface MarkdownShortcodePlaceholder {
  /** The name, without its braces. */
  name: string;
  /**
   * What is put in its place, in the words an editor would use.
   *
   * Written to follow "wird ersetzt durch", which is how the reference panel
   * renders it, so it begins in lower case and in the accusative.
   */
  description: string;
}

export interface MarkdownShortcodeParamDefinition {
  name: string;
  type: MarkdownShortcodeParamType;
  aliases?: readonly string[];
  defaultValue?: boolean | number | string;
  /**
   * What holds when the parameter is left out, where that is not a value the
   * parser can supply.
   *
   * Some defaults are decided further down than the parser: by the renderer, or
   * by the stylesheet. Naming them here would state them twice, so what goes in
   * is either a sentence saying what happens, or the custom property that
   * carries the value. A `var(--…)` is resolved against the page and shown in
   * pixels, so the reference states the figure without holding a copy of it.
   */
  defaultLabel?: string;
  /** Human name of the parameter, shown in the editor's reference. */
  label?: string;
  /**
   * Names this attribute's value accepts, each substituted by this shortcode
   * and by nothing else. Absent where the value is taken as it stands.
   */
  placeholders?: readonly MarkdownShortcodePlaceholder[];
  max?: number;
  min?: number;
  required?: boolean;
  values?: readonly string[];
}

/**
 * A table shown in the editor's reference under a shortcode's parameter list.
 *
 * For the few parameters whose values are easier to look up than to describe,
 * such as the nine alignments an icon knows. A sentence naming all of them is
 * one nobody reads twice.
 */
export interface MarkdownShortcodeTable {
  /** What the table answers, shown above it. */
  caption: string;
  /** The column headings, left to right. */
  columns: readonly string[];
  /** One entry per row, each holding as many cells as there are columns. */
  rows: readonly (readonly string[])[];
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
   * Whether the shortcode carries content between braces.
   *
   * Absent means `forbidden`, which is what every shortcode was before
   * containers existed.
   */
  body?: MarkdownShortcodeBodyRule;
  /** Value tables shown under the parameter list, where one helps. */
  tables?: readonly MarkdownShortcodeTable[];
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
  fieldReference: { value: "Referenz", label: "Beschriftung der Zeile Referenz" },
  referenceMissing: {
    value: "Referenz noch nicht vergeben",
    label: "Vorlesbarer Text, solange die Referenz fehlt",
  },
  fieldAmount: { value: "Betrag", label: "Beschriftung der Zeile Betrag" },
  amountOpen: { value: "du entscheidest", label: "Text, wenn kein Betrag gewählt ist" },
} as const satisfies Record<string, { value: string; label: string }>;

/** Name of one overridable support-ladder label. */
export type SupportLadderLabelKey = keyof typeof SUPPORT_LADDER_LABELS;

/**
 * Every word the sponsor form puts on screen.
 *
 * All of it is content rather than code, because it is the site speaking to
 * somebody about to give money and that is the operator's voice, not the
 * developer's. The shortcode's parameter list is derived from these entries, so
 * a new word is added in one place.
 */
export const SPONSOR_FORM_LABELS = {
  firstNameLabel: { value: "Vorname", label: "Beschriftung des Feldes Vorname" },
  lastNameLabel: { value: "Nachname", label: "Beschriftung des Feldes Nachname" },
  linkLabel: { value: "Website oder Profil", label: "Beschriftung des Feldes Adresse" },
  linkPlaceholder: { value: "deine-seite.at", label: "Platzhalter im leeren Adressfeld" },
  linkHint: {
    value:
      "Eine Adresse genügt, ob eigene Seite, Mastodon, Bluesky oder GitHub. Welcher Dienst es ist, erkennen wir selbst.",
    label: "Erklärung unter den Feldern",
  },
  linkInvalid: {
    value: "Das erkennen wir nicht als Adresse. Eine Website oder ein Profil, bitte.",
    label: "Meldung bei einer Adresse, die sich nicht zuordnen lässt",
  },
  claimLabel: { value: "Dein Satz", label: "Beschriftung des Feldes Satz" },
  claimRemaining: {
    value: "noch {n} Zeichen",
    label: "Restzähler am Feld Satz",
    placeholders: [{ name: "n", description: "die Zahl der noch freien Zeichen" }],
  },
  publishedLabel: {
    value: "Mit meinem Namen auf der Seite erscheinen",
    label: "Beschriftung des Schalters für die Nennung",
  },
  submitLabel: { value: "Angaben absenden", label: "Beschriftung des Absende-Knopfes" },
  submitBusyLabel: { value: "Einen Moment…", label: "Beschriftung während des Absendens" },
  issuedTitle: { value: "Deine Angaben stehen bereit.", label: "Überschrift nach dem Absenden" },
  issuedText: {
    value:
      "Die Überweisung unten trägt jetzt deine Referenz. Sobald das Geld da ist, erscheinst du auf der Seite.",
    label: "Text nach dem Absenden",
  },
  changeLabel: { value: "Angaben ändern", label: "Beschriftung des Knopfes zum Ändern" },
  failureTitle: { value: "Das ging schief", label: "Überschrift der Fehlermeldung" },
  failureClose: { value: "Verstanden", label: "Knopf, der die Fehlermeldung schliesst" },
  failureRateLimited: {
    value: "Das war eben schon ein paar Mal. Bitte versuche es später noch einmal.",
    label: "Meldung, wenn zu oft abgesendet wurde",
  },
  failureRejected: {
    value: "Das hat nicht geklappt. Bitte prüfe deine Angaben und versuche es erneut.",
    label: "Meldung, wenn die Angaben abgelehnt wurden",
  },
  failureOffline: {
    value: "Keine Verbindung zum Server. Bitte prüfe deine Verbindung.",
    label: "Meldung, wenn der Server nicht erreichbar war",
  },
} as const satisfies Record<
  string,
  { value: string; label: string; placeholders?: readonly MarkdownShortcodePlaceholder[] }
>;

/** Name of one word on the sponsor form. */
export type SponsorFormLabelKey = keyof typeof SPONSOR_FORM_LABELS;

/** Every word on the sponsor form, in declaration order. */
export const SPONSOR_FORM_LABEL_KEYS = Object.keys(
  SPONSOR_FORM_LABELS,
) as SponsorFormLabelKey[];

/** The wording used when the shortcode names no override. */
export const SPONSOR_FORM_DEFAULTS = Object.fromEntries(
  SPONSOR_FORM_LABEL_KEYS.map((key) => [key, SPONSOR_FORM_LABELS[key].value]),
) as Record<SponsorFormLabelKey, string>;

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
  image: "image",
  pdf: "pdf",
  hls: "hls",
  youtube: "youtube",
  rejectedShopsTable: "rejected-shops-table",
  supportLadder: "support-ladder",
  sponsors: "sponsors",
  icon: "icon",
  vstack: "vstack",
  hstack: "hstack",
  spacer: "spacer",
} as const;

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
 * The form that takes what the payment cannot carry.
 *
 * It belongs under the sponsor variant, because a sponsorship is the one
 * payment here that has to be attributed to a person, and everything the person
 * says about themselves is said in this form rather than in the transfer.
 *
 * Every word on it is named here. Anything left out falls back to the wording
 * in `SPONSOR_FORM_DEFAULTS`, so a page that names none of it still reads.
 */
const SUPPORT_LADDER_SPONSOR_FORM: MarkdownShortcodeDefinition = {
  token: "sponsorform",
  renderMode: "island",
  target: "forbidden",
  placement: "inline",
  label: "Sponsoren-Formular",
  description:
    "Das Formular, mit dem jemand seine Angaben hinterlässt und dafür eine Referenz bekommt. Gehört unter die Variante mit key=\"sponsor\". Ohne diesen Knoten erscheint kein Formular.",
  examples: ['[[sponsorform firstNameLabel="Vorname" submitLabel="Angaben absenden"]]'],
  params: SPONSOR_FORM_LABEL_KEYS.map((name) => {
    // Widened on the way out, because only one of the entries declares a
    // placeholder and reading the property off the literal union otherwise
    // fails on the ones that do not.
    const entry: {
      value: string;
      label: string;
      placeholders?: readonly MarkdownShortcodePlaceholder[];
    } = SPONSOR_FORM_LABELS[name];
    return {
      name,
      type: "string" as const,
      defaultValue: entry.value,
      label: entry.label,
      placeholders: entry.placeholders,
    };
  }),
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
    {
      name: "key",
      type: "enum",
      values: ["once", "monthly", "sponsor"],
      required: true,
      label: "Reiter: once, monthly oder sponsor",
    },
    { name: "title", type: "string", aliases: ["label"], label: "Überschrift" },
    { name: "text", type: "string", aliases: ["description"], label: "Beschreibender Text" },
    { name: "recommended", type: "boolean", label: "Hervorheben und vorauswählen" },
    // Marke aus der Zahlungsmethoden-Sammlung, dieselbe wie auf den
    // Shop-Detailseiten, oder "github" für das GitHub-Zeichen.
    { name: "icon", type: "string", label: "Symbol, z. B. sepa, paypal, klarna, github" },
  ],
  children: [SUPPORT_LADDER_QRCODE, SUPPORT_LADDER_INFO, SUPPORT_LADDER_SPONSOR_FORM],
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
    {
      name: "placeholder",
      type: "string",
      label: "Platzhalter im leeren Feld. Beim Sponsor-Reiter gilt stattdessen der Mindestbetrag",
    },
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
  description:
    "Der Zahlungsblock. Empfänger, IBAN und BIC stehen unter Sponsoring/Einstellungen und nicht hier. Enthält je einen variant-Block pro Intervall.",
  examples: ['[[bankaccount purposeDonation="Spende: lmaa.space"]]'],
  params: [
    {
      name: "purposeDonation",
      type: "string",
      aliases: ["purpose"],
      label: "Verwendungszweck einer Spende",
    },
    {
      name: "purposeSponsor",
      type: "string",
      label: "Verwendungszweck ab dem Mindestbetrag im Sponsor-Reiter",
    },
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
  description:
    "Ein Reiter der Leiter: einmalig, monatlich oder Sponsor. Enthält option und custom. Der Sponsor-Reiter kommt ohne option aus und zeigt nur das freie Feld.",
  examples: [
    '[[interval key="once" title="Einmalig" text="Einmalig ist vorausgewählt."]]',
    '[[interval key="sponsor" title="Sponsor werden" purpose="Sponsor: lmaa.space"]]',
  ],
  params: [
    {
      name: "key",
      type: "enum",
      values: ["once", "monthly", "sponsor"],
      required: true,
      label: "Reiter: once, monthly oder sponsor",
    },
    // The author writes "label" on an interval and "title" on a variant, so
    // both are accepted everywhere and neither has to be remembered.
    { name: "label", type: "string", aliases: ["title"], label: "Beschriftung" },
    {
      name: "text",
      type: "string",
      aliases: ["description"],
      label: "Beschreibender Text",
      placeholders: [
        { name: "annualAmount", description: "die Summe, die dieses Intervall im Jahr ergibt" },
      ],
    },
    { name: "hint", type: "string", label: "Hinweis unter dem Schalter" },
    {
      name: "belowMinimum",
      type: "string",
      label: "Hinweis, wenn der Betrag zu klein ist",
      placeholders: [{ name: "min", description: "den Mindestbetrag für eine Sponsorschaft" }],
    },
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
  '    purposeDonation="Spende: lmaa.space"',
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
        label:
          "Beschriftung neben dem Symbol, als Markdown. Überschriften und Absätze sind erlaubt",
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
  },
  {
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
  },
  {
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
  },
  {
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
        label:
          "Text, solange noch niemand sponsert. Der erste Absatz wird zur Überschrift der Karte",
      },
      {
        name: "emptyAction",
        type: "string",
        label: "Beschriftung des Knopfes darunter",
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

