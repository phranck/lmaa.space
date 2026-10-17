import { describe, expect, it } from "vitest";

import { unsplashAvif } from "./unsplash-photo";

describe("unsplashAvif", () => {
  it("asks Unsplash for AVIF and keeps every other parameter", () => {
    const stored =
      "https://images.unsplash.com/photo-1680446133056-ab5ddae749b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1080";
    const photo = new URL(unsplashAvif(stored));
    expect(photo.searchParams.get("fm")).toBe("avif");
    expect(photo.searchParams.get("w")).toBe("1080");
    expect(photo.searchParams.get("q")).toBe("80");
    expect(photo.pathname).toBe("/photo-1680446133056-ab5ddae749b9");
  });

  it("adds the format to an Unsplash URL that names none", () => {
    expect(unsplashAvif("https://images.unsplash.com/photo-1?w=640")).toBe(
      "https://images.unsplash.com/photo-1?w=640&fm=avif",
    );
  });

  it("asks for the width a place needs", () => {
    const photo = new URL(unsplashAvif("https://images.unsplash.com/photo-1?fm=jpg&w=1080", 640));
    expect(photo.searchParams.get("w")).toBe("640");
    expect(photo.searchParams.get("fm")).toBe("avif");
  });

  it("leaves a photo from another host as it is", () => {
    const shop = "https://shop.example/og.jpg?fm=jpg";
    expect(unsplashAvif(shop)).toBe(shop);
  });

  it("leaves a path on this site as it is", () => {
    expect(unsplashAvif("/images/sport.jpg")).toBe("/images/sport.jpg");
  });
});
