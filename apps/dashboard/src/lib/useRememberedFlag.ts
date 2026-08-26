import { useCallback, useState } from "react";

/**
 * A yes or no that survives a reload, kept in the browser it was set in.
 *
 * For the small choices somebody makes about a screen rather than about the
 * data: whether a section is open, whether a panel is shown. They belong to the
 * person sitting there and not to the record, so they stay in their browser.
 *
 * A browser that refuses to store anything still works; the answer is then the
 * given default for as long as the page is open.
 *
 * @param key - Where the answer is kept, in the naming of the other stores.
 * @param fallback - What holds until somebody decides otherwise.
 * @returns The current answer and a way to change it.
 */
export function useRememberedFlag(key: string, fallback: boolean): [boolean, (next: boolean) => void] {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? fallback : stored === "true";
    } catch {
      return fallback;
    }
  });

  const remember = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, String(next));
      } catch {
        // A browser that stores nothing still shows the section correctly for
        // as long as the page is open, which is a better outcome than failing.
      }
    },
    [key],
  );

  return [value, remember];
}
