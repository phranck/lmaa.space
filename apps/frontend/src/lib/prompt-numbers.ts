/**
 * The reader's own numbers, known only in their browser.
 *
 * @property likedShops - How many shops they have kept.
 * @property shopViews - How many shops they have looked at.
 */
export interface PromptCounts {
  likedShops: number;
  shopViews: number;
}

/** The placeholder names a prompt text may use, and the count each stands for. */
const COUNT_BY_NAME: Record<string, keyof PromptCounts> = {
  shops: "likedShops",
  views: "shopViews",
};

/**
 * A count placeholder, either bare or carrying a singular and a plural form.
 *
 * The forms are taken as written up to the closing brace, so they may hold
 * spaces and markup. They may not hold a brace themselves, which is what keeps
 * this from running past the end of its own placeholder.
 */
const PLACEHOLDER = /\{([a-z]+)(?:\s+([^|{}]+)\|([^|{}]+))?\}/g;

/**
 * Puts the reader's own numbers into a prompt text.
 *
 * A bare `{shops}` becomes the number alone. `{shops Shop|Shops}` becomes the
 * number and the form that fits it, so a text can name a count without its
 * author having to know what the count will be. Every number other than one
 * takes the plural, zero included, which is the rule German and English share.
 *
 * The text arrives as rendered HTML rather than as Markdown, because the
 * placeholders are written by the same person who writes the prose and must
 * survive being marked up.
 *
 * @param html - The rendered prompt text.
 * @param counts - The reader's numbers.
 * @returns The text with every known placeholder filled. One this does not know
 *   is left standing, so a typo shows itself instead of quietly vanishing.
 */
export function fillPromptNumbers(html: string, counts: PromptCounts): string {
  return html.replace(PLACEHOLDER, (match, name: string, singular?: string, plural?: string) => {
    const key = COUNT_BY_NAME[name];
    if (!key) return match;

    const count = counts[key];
    if (singular === undefined || plural === undefined) return String(count);

    return `${count} ${count === 1 ? singular : plural}`;
  });
}
