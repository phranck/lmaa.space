import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import ShopCardReact from "@/components/ShopCardReact";

const CURRENT_LIKES_KEY = "lmaa-liked-shops:v1";

function installLocalStorage(values: Record<string, string>) {
  const entries = new Map(Object.entries(values));
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  });
}

describe("liked shop consumers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the liked indicator from the current storage version", () => {
    installLocalStorage({ [CURRENT_LIKES_KEY]: JSON.stringify(["42"]) });

    const markup = renderToStaticMarkup(
      <ShopCardReact
        shopId={42}
        name="Test Shop"
        url="https://example.com"
        detailHref="/shop/42"
      />,
    );

    expect(markup).toContain("text-red-500");
  });

  it("keeps the header on the centralized liked-shop storage API", () => {
    const source = readFileSync(new URL("../components/Header.astro", import.meta.url), "utf8");

    expect(source).toContain("getLikedShopIds()");
    expect(source).not.toContain('localStorage.getItem("lmaa-liked-shops")');
  });
});
