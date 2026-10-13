/**
 * Lets the theme switch in the header change the theme.
 *
 * The head script has already put the stored choice on the page. This marks it
 * in both radio groups, the segments on a wide screen and the list on a phone,
 * and from then on keeps the page, the storage and both groups in step: when
 * the visitor chooses, when the device changes its setting whilst System is
 * chosen, when another tab of the site chooses, and when the browser shows this
 * page again from its back-forward cache.
 */
import {
  applyThemeChoice,
  DARK_SCHEME_QUERY,
  parseThemeChoice,
  readThemeChoice,
  storeThemeChoice,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from "@/lib/theme";

const radios = [...document.querySelectorAll<HTMLInputElement>("input[name^='theme-choice-']")];

/**
 * Marks a choice in both radio groups, which is what a screen reader and the
 * arrow keys go by. What a reader sees is drawn from the root element instead.
 *
 * @param choice - The choice to mark.
 */
function markChoice(choice: ThemeChoice): void {
  for (const radio of radios) radio.checked = radio.value === choice;
}

/**
 * The choice the page shows now.
 *
 * Read from the page rather than from the storage, because a browser that
 * refuses storage still shows the choice made on this page.
 *
 * @returns The choice on the root element.
 */
function choiceOnPage(): ThemeChoice {
  return parseThemeChoice(document.documentElement.dataset.themeChoice);
}

/**
 * Changes the theme in front of the visitor, as one crossfade of the whole
 * page where the browser can draw one.
 *
 * @param choice - The choice to show.
 */
function showTheme(choice: ThemeChoice): void {
  if (typeof document.startViewTransition === "function") {
    document.startViewTransition(() => applyThemeChoice(choice));
  } else {
    applyThemeChoice(choice);
  }
}

/**
 * Takes up the stored choice where it may have changed behind this page's
 * back. Applied at once rather than crossfaded: another tab's choice reaches a
 * page that is in the background, and a page coming back from the cache
 * should open in the theme chosen meanwhile rather than change in front of the
 * visitor.
 */
function followStoredChoice(): void {
  const choice = readThemeChoice();
  markChoice(choice);
  applyThemeChoice(choice);
}

for (const radio of radios) {
  radio.addEventListener("change", () => {
    if (!radio.checked) return;
    const choice = parseThemeChoice(radio.value);
    storeThemeChoice(choice);
    markChoice(choice);
    showTheme(choice);
  });
}

matchMedia(DARK_SCHEME_QUERY).addEventListener("change", () => {
  if (choiceOnPage() === "system") showTheme("system");
});

window.addEventListener("storage", (event) => {
  // A key of `null` means the whole storage was cleared.
  if (event.key === THEME_STORAGE_KEY || event.key === null) followStoredChoice();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) followStoredChoice();
});

markChoice(choiceOnPage());
