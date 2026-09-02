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
 *
 * These work in a form field and nowhere else, because `expandTextTokens` is
 * called only from the form renderer. A content page is Markdown, where the
 * character can be written directly or as an HTML entity, so it needs no second
 * notation. Something written in braces on a content page is a site variable,
 * per `site-variables.ts`, or a placeholder belonging to one shortcode
 * attribute, and neither of those is expanded here.
 */

/**
 * Every named token, with the character it stands for.
 *
 * The form builder's reference is rendered from this, so the table an editor
 * reads cannot list a token the expander does not know, nor miss one it does.
 *
 * @remarks
 * The codepoint is stated rather than derived from the character, because it is
 * the form an editor types when they reach for `U+XXXX` instead, and that form
 * is padded to four digits whilst `toString(16)` is not.
 */
export const TEXT_TOKENS = {
  nbhy: { character: "‑", codepoint: "U+2011" },
  nbsp: { character: " ", codepoint: "U+00A0" },
  wj: { character: "⁠", codepoint: "U+2060" },
  shy: { character: "­", codepoint: "U+00AD" },
  ndash: { character: "–", codepoint: "U+2013" },
  mdash: { character: "—", codepoint: "U+2014" },
  zwj: { character: "‍", codepoint: "U+200D" },
  zwnj: { character: "‌", codepoint: "U+200C" },
} as const satisfies Record<string, { character: string; codepoint: string }>;

/** Name of one text token. */
export type TextTokenName = keyof typeof TEXT_TOKENS;

/** Every text token, in declaration order. */
export const TEXT_TOKEN_NAMES = Object.keys(TEXT_TOKENS) as TextTokenName[];

const NAMED_TOKENS: Record<string, string> = Object.fromEntries(
  TEXT_TOKEN_NAMES.map((name) => [name, TEXT_TOKENS[name].character]),
);

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
