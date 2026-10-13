import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyThemeChoice,
  isDarkTheme,
  parseThemeChoice,
  readThemeChoice,
  storeThemeChoice,
  THEME_STORAGE_KEY,
} from "./theme";

/** A storage holding whatever it is given, as `localStorage` does. */
function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

/** A storage that refuses every access, as some private modes do. */
const refusingStorage = {
  getItem: () => {
    throw new Error("refused");
  },
  setItem: () => {
    throw new Error("refused");
  },
  removeItem: () => {
    throw new Error("refused");
  },
};

/**
 * The parts of a page `applyThemeChoice` touches: the root element, the
 * `theme-color` meta element, the device's setting and the stylesheet's
 * header color per theme.
 */
function fakePage(deviceIsDark: boolean) {
  const classes = new Set<string>();
  const root = {
    classList: {
      toggle: (name: string, on: boolean) => void (on ? classes.add(name) : classes.delete(name)),
    },
    dataset: {} as Record<string, string>,
  };
  const meta = {
    content: "",
    setAttribute: (_name: string, value: string) => (meta.content = value),
  };
  vi.stubGlobal("document", {
    documentElement: root,
    querySelector: (selector: string) => (selector === 'meta[name="theme-color"]' ? meta : null),
  });
  vi.stubGlobal("matchMedia", () => ({ matches: deviceIsDark }));
  vi.stubGlobal("getComputedStyle", () => ({
    getPropertyValue: (name: string) =>
      name === "--ds-theme-color" ? (classes.has("dark") ? " #191714" : " #f4efe6") : "",
  }));
  return { classes, root, meta };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseThemeChoice", () => {
  it.each([
    ["light", "light"],
    ["dark", "dark"],
    ["system", "system"],
    [null, "system"],
    ["sepia", "system"],
  ] as const)("reads %s as %s", (stored, choice) => {
    expect(parseThemeChoice(stored)).toBe(choice);
  });
});

describe("isDarkTheme", () => {
  it.each([
    ["system", false, false],
    ["system", true, true],
    ["light", true, false],
    ["dark", false, true],
  ] as const)(
    "shows %s on a device set to dark: %s gives Salon: %s",
    (choice, deviceIsDark, dark) => {
      expect(isDarkTheme(choice, deviceIsDark)).toBe(dark);
    },
  );
});

describe("storing the choice", () => {
  it("keeps Light and Dark", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);

    storeThemeChoice("dark");

    expect(storage.values.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(readThemeChoice()).toBe("dark");
  });

  it("removes the stored choice for System", () => {
    const storage = memoryStorage({ [THEME_STORAGE_KEY]: "light" });
    vi.stubGlobal("localStorage", storage);

    storeThemeChoice("system");

    expect(storage.values.has(THEME_STORAGE_KEY)).toBe(false);
    expect(readThemeChoice()).toBe("system");
  });

  it("falls back to System when the storage refuses", () => {
    vi.stubGlobal("localStorage", refusingStorage);

    expect(() => storeThemeChoice("dark")).not.toThrow();
    expect(readThemeChoice()).toBe("system");
  });
});

describe("applyThemeChoice", () => {
  it("follows the device for System", () => {
    const page = fakePage(true);

    applyThemeChoice("system");

    expect(page.classes.has("dark")).toBe(true);
    expect(page.root.dataset.themeChoice).toBe("system");
  });

  it("shows Papier for Light on a device set to dark", () => {
    const page = fakePage(true);
    page.classes.add("dark");

    applyThemeChoice("light");

    expect(page.classes.has("dark")).toBe(false);
    expect(page.root.dataset.themeChoice).toBe("light");
  });

  it("hands the theme's header color to the browser", () => {
    const page = fakePage(false);

    applyThemeChoice("dark");

    expect(page.meta.content).toBe("#191714");
  });
});
