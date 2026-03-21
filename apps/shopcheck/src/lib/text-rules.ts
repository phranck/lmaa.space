export const FORBIDDEN_DASHES = /[—–]/;
const ASCII_UMLAUT_REPLACEMENTS = /\b[a-z]*?(?:ae|oe|ue)[a-z]*\b/g;
const ASCII_ESZETT_REPLACEMENTS = /\b(?:strasse|grosse|grossen|grosser|grosses|groesse|weiss|heisst|aussen|ausser|fuss|fliess|schliessen|geniessen|gruss)\b/gi;

export type TextRuleViolation = {
  field: string;
  reason: string;
};

export function containsForbiddenDashes(value: string): boolean {
  return FORBIDDEN_DASHES.test(value);
}

export function getForbiddenDashViolation(value: string, field: string): TextRuleViolation | null {
  if (!containsForbiddenDashes(value)) return null;
  return {
    field,
    reason: `${field} enthält einen verbotenen Gedankenstrich (– oder —).`,
  };
}

export function findAsciiGermanSpellingHints(value: string): string[] {
  const hints = new Set<string>();

  for (const match of value.matchAll(ASCII_UMLAUT_REPLACEMENTS)) {
    const word = match[0];
    if (word.length >= 4) hints.add(word);
  }

  for (const match of value.matchAll(ASCII_ESZETT_REPLACEMENTS)) {
    hints.add(match[0]);
  }

  return [...hints];
}

export function getGermanSpellingViolation(value: string, field: string): TextRuleViolation | null {
  const hints = findAsciiGermanSpellingHints(value);
  if (hints.length === 0) return null;
  return {
    field,
    reason: `${field} verwendet ASCII-Umschreibungen statt echter deutscher Umlaute oder ß (${hints.slice(0, 4).join(", ")}).`,
  };
}
