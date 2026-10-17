/**
 * The visitor's choice between the site's two themes, Papier and Salon.
 *
 * Shared by the script Astro writes into the head of every page, which puts the
 * theme on the page before its first paint, and by the theme switch in the
 * header, which changes it afterwards. Both go through `applyThemeChoice`, so
 * the page looks the same whichever of the two set it.
 */

/** The three choices, in the order the switch shows them. */
export const THEME_CHOICES = ["system", "light", "dark"] as const;

/** One of the three choices: follow the device, or Papier or Salon outright. */
export type ThemeChoice = (typeof THEME_CHOICES)[number];

/**
 * Where an explicit choice is kept. System keeps nothing, so a visitor who
 * never touches the switch leaves nothing behind in the browser.
 */
export const THEME_STORAGE_KEY = "lmaa-theme";

/** The media query a device set to dark answers. */
export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

/**
 * The custom property holding the color of the header, which is also the color
 * the browser paints its own bar around the page in. `global.css` states it
 * per theme.
 */
const THEME_COLOR_PROPERTY = "--ds-theme-color";

/**
 * The choice a stored value stands for.
 *
 * @param stored - What the storage holds, or `null` when it holds nothing.
 * @returns `light` or `dark` for those two values, `system` for anything else,
 *   so a value written by an older version of the site or by hand falls back
 *   to the device rather than to a theme nobody chose.
 */
export function parseThemeChoice(stored: string | null | undefined): ThemeChoice {
  return stored === "light" || stored === "dark" ? stored : "system";
}

/**
 * Whether a choice shows Salon, the dark theme.
 *
 * @param choice - The visitor's choice.
 * @param deviceIsDark - Whether the device is set to dark at this moment.
 * @returns `true` for Salon, `false` for Papier.
 */
export function isDarkTheme(choice: ThemeChoice, deviceIsDark: boolean): boolean {
  return choice === "dark" || (choice === "system" && deviceIsDark);
}

/**
 * The choice this browser has kept.
 *
 * @returns The stored choice, or `system` when nothing is stored or the
 *   storage cannot be read, which it cannot in some private modes.
 */
export function readThemeChoice(): ThemeChoice {
  try {
    return parseThemeChoice(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

/**
 * Keeps a choice for the next page and the next visit.
 *
 * System removes the stored value instead of storing `system`, so the device
 * decides again from then on.
 *
 * @param choice - The visitor's choice.
 */
export function storeThemeChoice(choice: ThemeChoice): void {
  try {
    if (choice === "system") {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, choice);
    }
  } catch {
    // Storage refused: the choice holds on this page and is gone on the next.
  }
}

/**
 * Puts a choice on the page.
 *
 * Sets `dark` on the root element, which is the class the stylesheet's Salon
 * values and UnoCSS's dark variant read, and `data-theme-choice`, which the
 * switch reads to show the choice made from the first frame on. Then it hands
 * the header's color to the `theme-color` meta element, read from the
 * stylesheet so that the value is stated in one place only. That read needs the
 * stylesheet to be loaded, which it is wherever this runs: the head script
 * stands after the stylesheet, and the switch runs once the page is there.
 *
 * @param choice - The visitor's choice.
 */
export function applyThemeChoice(choice: ThemeChoice): void {
  const root = document.documentElement;
  root.classList.toggle("dark", isDarkTheme(choice, matchMedia(DARK_SCHEME_QUERY).matches));
  root.dataset.themeChoice = choice;

  const themeColor = getComputedStyle(root).getPropertyValue(THEME_COLOR_PROPERTY).trim();
  if (themeColor) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
  }
}
