import type { MarkdownShortcodePlaceholder } from "./types.js";

/**
 * Every word the sponsor form puts on screen.
 *
 * All of it is content rather than code, because it is the site speaking to
 * somebody about to give money and that is the operator's voice, not the
 * developer's. The shortcode's parameter list is derived from these entries, so
 * a new word is added in one place.
 */
export const SPONSOR_FORM_LABELS = {
  nameLabel: { value: "Name", label: "Beschriftung des Feldes Name" },
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
export const SPONSOR_FORM_LABEL_KEYS = Object.keys(SPONSOR_FORM_LABELS) as SponsorFormLabelKey[];

/** The wording used when the shortcode names no override. */
export const SPONSOR_FORM_DEFAULTS = Object.fromEntries(
  SPONSOR_FORM_LABEL_KEYS.map((key) => [key, SPONSOR_FORM_LABELS[key].value]),
) as Record<SponsorFormLabelKey, string>;
