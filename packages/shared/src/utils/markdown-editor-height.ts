/**
 * Remembering how tall somebody dragged a Markdown editor.
 *
 * A height set by hand is a preference like the editor's footer switches beside
 * it: set once, expected to hold. `resize` changes the element in the DOM and
 * tells nobody, so the height has to be observed and stored.
 *
 * The decisions live here rather than in the editor because they are arithmetic
 * and storage rather than rendering, and `packages/ui` has no test setup whilst
 * this package does.
 */

/** Where a remembered height is kept, with the editor's own id after it. */
const HEIGHT_STORAGE_PREFIX = "lmaa.markdown-editor.height.";

/**
 * Shortest an editor may be remembered at, in pixels.
 *
 * Two lines and the footer. Below that the editor is a slot rather than
 * something to write in, and a stored height that small is far more likely to
 * be a stray drag than a decision.
 */
const MIN_REMEMBERED_HEIGHT = 96;

/**
 * Tallest an editor may be remembered at, in pixels.
 *
 * Well past any screen in use, so it bounds a nonsense value without ever
 * refusing a real one.
 */
const MAX_REMEMBERED_HEIGHT = 4000;

/**
 * Where one editor's height is stored.
 *
 * @param id - The editor's own id, as the call site gives it.
 * @returns The storage key, or `null` for an editor without an id.
 *
 * @remarks
 * Per editor rather than one height for all of them: a description and a
 * one-line note are not the same thing to whoever sizes them. An editor with no
 * id cannot be told apart from another, so it remembers nothing rather than
 * sharing somebody else's height.
 */
export function editorHeightKey(id: string | undefined): string | null {
  return id ? `${HEIGHT_STORAGE_PREFIX}${id}` : null;
}

/**
 * Reads a stored height back.
 *
 * @param stored - What storage held, or `null` where it held nothing.
 * @returns The height as a CSS length, or `null` where nothing usable was
 * stored.
 *
 * @remarks
 * Anything outside the bounds is discarded rather than clamped. A value that
 * far out was not a decision, and starting at the nearest allowed height would
 * present it as one.
 */
export function readStoredEditorHeight(stored: string | null): string | null {
  if (!stored) return null;

  const pixels = Number(stored);
  if (!Number.isFinite(pixels)) return null;
  if (pixels < MIN_REMEMBERED_HEIGHT || pixels > MAX_REMEMBERED_HEIGHT) return null;

  return `${Math.round(pixels)}px`;
}

/**
 * Whether a height the editor settled at is worth storing.
 *
 * @param pixels - What the element measures now.
 * @param stored - What is already stored for it, if anything.
 * @returns `true` where the value is inside the bounds and differs from what
 * stands there.
 *
 * @remarks
 * A drag reports continuously and `localStorage` is synchronous, so the run
 * that writes asks first whether writing changes anything. Rounded to the pixel
 * before comparing, because a sub-pixel measurement differs every time and
 * would make the question always answer yes.
 */
export function shouldStoreEditorHeight(pixels: number, stored: string | null): boolean {
  if (!Number.isFinite(pixels)) return false;
  if (pixels < MIN_REMEMBERED_HEIGHT || pixels > MAX_REMEMBERED_HEIGHT) return false;

  return String(Math.round(pixels)) !== stored;
}
