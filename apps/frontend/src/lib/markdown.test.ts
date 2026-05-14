import { describe, expect, it } from "vitest";

import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders HLS shortcodes with media aliases", async () => {
    const html = await renderMarkdown(
      'Intro\n\n[[hls:lmaa-history title="lmaa.space History" caption="Timeline" aspect="16/9" poster="lmaa-history-poster"]]',
      {
        "lmaa-history":
          "https://storage-prg1.zerops.io/4g7u0-objectstorage/c12bebd8-5e8a-463a-b85b-5eef48c7ba40-lmaa-history/index.m3u8",
        "lmaa-history-poster":
          "https://storage-prg1.zerops.io/4g7u0-objectstorage/c12bebd8-5e8a-463a-b85b-5eef48c7ba40-lmaa-history/poster.jpg",
      },
    );

    expect(html).toContain('class="md-video"');
    expect(html).toContain('class="md-video-frame"');
    expect(html).toContain('class="js-hls-player"');
    expect(html).toContain(
      'data-hls-src="https://storage-prg1.zerops.io/4g7u0-objectstorage/c12bebd8-5e8a-463a-b85b-5eef48c7ba40-lmaa-history/index.m3u8"',
    );
    expect(html).toContain(
      'poster="https://storage-prg1.zerops.io/4g7u0-objectstorage/c12bebd8-5e8a-463a-b85b-5eef48c7ba40-lmaa-history/poster.jpg"',
    );
    expect(html).toContain('style="--md-video-aspect-ratio:16 / 9;"');
    expect(html).toContain("<figcaption>Timeline</figcaption>");
  });

  it("does not render unsafe HLS URLs", async () => {
    const html = await renderMarkdown("[[hls:javascript:alert(1)]]");

    expect(html).toContain("[[hls:javascript:alert(1)]]");
    expect(html).not.toContain("data-hls-src");
  });

  it("only renders HLS manifest URLs", async () => {
    const html = await renderMarkdown("[[hls:/uploads/movie.mp4]]");

    expect(html).toContain("[[hls:/uploads/movie.mp4]]");
    expect(html).not.toContain("js-hls-player");
  });
});
