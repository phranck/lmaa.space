// The support ladder and everything that may stand inside it. The nodes are
// declared from the innermost outwards, because each parent names its children
// by reference.

import { SPONSOR_FORM_LABEL_KEYS, SPONSOR_FORM_LABELS } from "./sponsor-form-labels.js";
import { SUPPORT_LADDER_LABEL_KEYS, SUPPORT_LADDER_LABELS } from "./support-ladder-labels.js";
import { MARKDOWN_SHORTCODE_TOKENS } from "./tokens.js";
import type {
  MarkdownShortcodeDefinition,
  MarkdownShortcodeParamDefinition,
  MarkdownShortcodePlaceholder,
} from "./types.js";

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
    'Das Formular, mit dem jemand seine Angaben hinterlässt und dafür eine Referenz bekommt. Gehört unter die Variante mit key="sponsor". Ohne diesen Knoten erscheint kein Formular.',
  examples: ['[[sponsorform nameLabel="Name" submitLabel="Angaben absenden"]]'],
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
  description:
    "Überschrift und Text der Bankverbindung für ein Intervall. Bei once erscheint der GiroCode, bei monthly die Anleitung für den Dauerauftrag.",
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
  description:
    "Ein vorgeschlagener Betrag und wofür er reicht. Mit recommended startet die Leiter darauf.",
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
    { name: "hint", type: "string", label: "Hinweis als Notizkarte, unter dem Text" },
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
  examples: [
    '[[paypalme title="PayPal" url="https://www.paypal.com/paypalme/…"',
    '  hint="Schreib **lmaa.space** dazu, dann landet es hier richtig."]]',
  ],
  params: [
    { name: "url", type: "string", required: true, label: "Adresse" },
    { name: "title", type: "string", label: "Überschrift" },
    { name: "text", type: "string", label: "Beschreibender Text" },
    { name: "hint", type: "string", label: "Hinweis als Notizkarte, unter dem Text" },
    { name: "button", type: "string", label: "Beschriftung des Knopfes" },
    // Marke aus der Zahlungsmethoden-Sammlung, dieselbe wie auf den
    // Shop-Detailseiten, oder "github" für das GitHub-Zeichen.
    { name: "icon", type: "string", label: "Symbol, z. B. sepa, paypal, klarna, github" },
  ],
};

/**
 * Every label the component itself shows, as a parameter of the shortcode.
 *
 * Derived from the catalogue so a new label reaches the editor's reference
 * without being written a second time. Each falls back to the entry in
 * `SUPPORT_LADDER_LABEL_DEFAULTS`.
 */
const SUPPORT_LADDER_LABEL_PARAMS: readonly MarkdownShortcodeParamDefinition[] =
  SUPPORT_LADDER_LABEL_KEYS.map((name) => ({
    name,
    type: "string" as const,
    defaultValue: SUPPORT_LADDER_LABELS[name].value,
    label: SUPPORT_LADDER_LABELS[name].label,
  }));

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

/** The donation block of the support page, with every route it offers. */
export const SUPPORT_LADDER_SHORTCODE = {
  token: MARKDOWN_SHORTCODE_TOKENS.supportLadder,
  renderMode: "island",
  target: "forbidden",
  placement: "block",
  label: "Spenden-Leiter",
  description:
    "Der Spendenblock der Support-Seite: Beträge, Kontodaten, GiroCode und PayPal. Enthält bankaccount, interval und paypalme.",
  examples: [SUPPORT_LADDER_EXAMPLE],
  params: SUPPORT_LADDER_LABEL_PARAMS,
  children: [
    SUPPORT_LADDER_BANK_ACCOUNT,
    SUPPORT_LADDER_INTERVAL,
    SUPPORT_LADDER_PAYPAL,
    SUPPORT_LADDER_SPONSORS,
  ],
} as const satisfies MarkdownShortcodeDefinition;
