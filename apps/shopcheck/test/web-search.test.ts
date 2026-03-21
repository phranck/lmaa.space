import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeSocialProfileUrl } from "../src/pipeline/web-search";

test("sanitizeSocialProfileUrl keeps profile URLs and rejects share or content URLs", () => {
  assert.equal(
    sanitizeSocialProfileUrl("instagram", "https://www.instagram.com/example_shop/?utm_source=ig_web_button_share_sheet"),
    "https://www.instagram.com/example_shop",
  );
  assert.equal(
    sanitizeSocialProfileUrl("instagram", "https://www.instagram.com/p/ABC123/"),
    null,
  );
  assert.equal(
    sanitizeSocialProfileUrl("facebook", "https://www.facebook.com/ExampleShop/"),
    "https://www.facebook.com/ExampleShop",
  );
  assert.equal(
    sanitizeSocialProfileUrl("facebook", "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.com"),
    null,
  );
  assert.equal(
    sanitizeSocialProfileUrl("youtube", "https://www.youtube.com/@exampleshop"),
    "https://www.youtube.com/@exampleshop",
  );
  assert.equal(
    sanitizeSocialProfileUrl("youtube", "https://www.youtube.com/watch?v=abcdef"),
    null,
  );
  assert.equal(
    sanitizeSocialProfileUrl("twitter", "https://x.com/example_shop"),
    "https://x.com/example_shop",
  );
  assert.equal(
    sanitizeSocialProfileUrl("twitter", "https://x.com/intent/post?text=hello"),
    null,
  );
  assert.equal(
    sanitizeSocialProfileUrl("threads", "https://www.threads.net/@example_shop"),
    "https://www.threads.net/@example_shop",
  );
});
