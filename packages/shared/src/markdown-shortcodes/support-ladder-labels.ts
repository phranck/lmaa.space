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

/** Every overridable label name, in declaration order. */
export const SUPPORT_LADDER_LABEL_KEYS = Object.keys(
  SUPPORT_LADDER_LABELS,
) as SupportLadderLabelKey[];

/** The wording used when the shortcode names no override. */
export const SUPPORT_LADDER_LABEL_DEFAULTS = Object.fromEntries(
  SUPPORT_LADDER_LABEL_KEYS.map((key) => [key, SUPPORT_LADDER_LABELS[key].value]),
) as Record<SupportLadderLabelKey, string>;
