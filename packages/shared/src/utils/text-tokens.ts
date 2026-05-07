/**
 * Expands user-friendly token notations in plain-text strings into the
 * corresponding Unicode characters. Used by the form renderer so editors can
 * insert non-typeable characters (non-breaking hyphen, no-break space, etc.)
 * via readable tokens instead of pasting raw Unicode.
 *
 * Supported notations:
 * - `U+XXXX` (4-6 hex digits, case-insensitive) — followed by a non-word
 *   character (space, punctuation, end of string). When followed directly by
 *   a hex letter (a-f) the token is left unexpanded; use `{nbhy}` or
 *   `&#8209;` instead in that case.
 * - Named tokens (case-insensitive): `{nbhy}`, `{nbsp}`, `{wj}`, `{shy}`,
 *   `{ndash}`, `{mdash}`, `{zwj}`, `{zwnj}`.
 * - HTML numeric entities: `&#NNN;` (decimal), `&#xHH;` (hex).
 *
 * Unknown tokens are left untouched.
 */

const NAMED_TOKENS: Record<string, string> = {
  nbhy: "‑",
  nbsp: " ",
  wj: "⁠",
  shy: "­",
  ndash: "–",
  mdash: "—",
  zwj: "‍",
  zwnj: "‌",
};

const NAMED_TOKEN_PATTERN = /\{([a-zA-Z]+)\}/g;
const HTML_DECIMAL_PATTERN = /&#(\d+);/g;
const HTML_HEX_PATTERN = /&#[xX]([0-9A-Fa-f]+);/g;
const UNICODE_PATTERN = /[Uu]\+([0-9A-Fa-f]{4,6})\b/g;

function safeFromCodePoint(code: number): string | null {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return null;
  if (code >= 0xd800 && code <= 0xdfff) return null;
  try {
    return String.fromCodePoint(code);
  } catch {
    return null;
  }
}

export function expandTextTokens(text: string): string;
export function expandTextTokens(text: undefined): undefined;
export function expandTextTokens(text: string | undefined): string | undefined;
export function expandTextTokens(text: string | undefined): string | undefined {
  if (text === undefined || text === "") return text;

  let result = text;

  result = result.replace(NAMED_TOKEN_PATTERN, (match, name: string) => {
    const replacement = NAMED_TOKENS[name.toLowerCase()];
    return replacement ?? match;
  });

  result = result.replace(HTML_DECIMAL_PATTERN, (match, digits: string) => {
    const code = Number.parseInt(digits, 10);
    return safeFromCodePoint(code) ?? match;
  });

  result = result.replace(HTML_HEX_PATTERN, (match, hex: string) => {
    const code = Number.parseInt(hex, 16);
    return safeFromCodePoint(code) ?? match;
  });

  result = result.replace(UNICODE_PATTERN, (match, hex: string) => {
    const code = Number.parseInt(hex, 16);
    return safeFromCodePoint(code) ?? match;
  });

  return result;
}
