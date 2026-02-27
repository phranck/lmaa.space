import { EditorSelection } from "@codemirror/state";
import { type EditorView, keymap } from "@codemirror/view";

/**
 * Wraps current editor selection with surrounding tokens.
 *
 * @param view - CodeMirror editor view.
 * @param before - Prefix token.
 * @param after - Suffix token.
 * @returns Always `true` to signal command handled.
 */
function wrapSelection(view: EditorView, before: string, after: string): boolean {
  view.dispatch(
    view.state.changeByRange((range) => {
      const text = view.state.sliceDoc(range.from, range.to);
      const insert = `${before}${text}${after}`;
      return {
        changes: { from: range.from, to: range.to, insert },
        range: EditorSelection.range(
          range.from + before.length,
          range.from + before.length + text.length,
        ),
      };
    }),
  );
  return true;
}

/**
 * Keyboard shortcuts used by the Markdown source editor.
 *
 * Provides bold/italic/link helpers aligned with common editor behavior.
 */
export const sourceKeymap = keymap.of([
  {
    key: "Mod-b",
    run: (view) => wrapSelection(view, "**", "**"),
  },
  {
    key: "Mod-i",
    run: (view) => wrapSelection(view, "*", "*"),
  },
  {
    key: "Mod-k",
    run(view) {
      const { state } = view;

      function insertLink(url: string) {
        view.dispatch(
          state.changeByRange((range) => {
            const sel = state.sliceDoc(range.from, range.to);
            const insert = `[${sel}](${url})`;
            return {
              changes: { from: range.from, to: range.to, insert },
              range: EditorSelection.cursor(range.from + insert.length),
            };
          }),
        );
      }

      navigator.clipboard
        .readText()
        .then((text) => {
          const trimmed = text.trim();
          const url =
            trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : "";
          insertLink(url);
        })
        .catch(() => insertLink(""));

      return true;
    },
  },
]);
