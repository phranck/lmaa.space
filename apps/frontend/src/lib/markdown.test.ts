import { describe, expect, it } from "vitest";

import { renderMarkdown, stripMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders image and PDF shortcodes through the registry parser", async () => {
    const html = await renderMarkdown(
      '[[image:/uploads/hero.jpg alt="Hero" caption="Launch" width=640 height=360]]\n\n[[pdf:/uploads/guide.pdf label="Guide"]]',
    );

    expect(html).toContain('class="md-image"');
    expect(html).toContain('src="/uploads/hero.jpg"');
    expect(html).toContain('alt="Hero"');
    expect(html).toContain('width="640"');
    expect(html).toContain('height="360"');
    expect(html).toContain("<figcaption>Launch</figcaption>");
    expect(html).toContain('class="md-pdf"');
    expect(html).toContain('href="/uploads/guide.pdf"');
    expect(html).toContain(">Guide</a>");
  });

  it("keeps island shortcodes as literal markdown in the HTML renderer", async () => {
    const html = await renderMarkdown("[[rejected-shops-table pageSize=30]]");

    expect(html).toContain("[[rejected-shops-table pageSize=30]]");
  });

  it("renders HLS shortcodes with media aliases", async () => {
    const html = await renderMarkdown(
      'Intro\n\n[[hls:lmaa-history title="lmaa.space History" caption="Timeline" aspect="16/9"]]',
      {
        "lmaa-history": {
          url: "https://storage-prg1.zerops.io/4g7u0-objectstorage/c12bebd8-5e8a-463a-b85b-5eef48c7ba40-lmaa-history/index.m3u8",
          posterUrl:
            "https://storage-prg1.zerops.io/4g7u0-objectstorage/c12bebd8-5e8a-463a-b85b-5eef48c7ba40-lmaa-history/poster.jpg",
        },
      },
    );

    expect(html).toContain('class="md-video"');
    expect(html).toContain('class="md-video-frame"');
    expect(html).toContain('class="md-video-maximize"');
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

  it("lets explicit HLS poster attributes override alias poster URLs", async () => {
    const html = await renderMarkdown('[[hls:movie poster="custom-poster"]]', {
      movie: {
        url: "https://storage-prg1.zerops.io/bucket/movie/index.m3u8",
        posterUrl: "https://storage-prg1.zerops.io/bucket/movie/poster.jpg",
      },
      "custom-poster": "https://storage-prg1.zerops.io/bucket/custom-poster.webp",
    });

    expect(html).toContain('poster="https://storage-prg1.zerops.io/bucket/custom-poster.webp"');
    expect(html).not.toContain('poster="https://storage-prg1.zerops.io/bucket/movie/poster.jpg"');
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

  it("renders YouTube shortcodes from short URLs", async () => {
    const html = await renderMarkdown(
      '[[youtube:https://youtu.be/dQw4w9WgXcQ title="Launch video" caption="Watch this" aspect="9/16"]]',
    );

    expect(html).toContain('class="md-video md-youtube"');
    expect(html).toContain('class="md-youtube-frame"');
    expect(html).toContain('class="md-youtube-player"');
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('title="Launch video"');
    expect(html).toContain("allowfullscreen");
    expect(html).toContain('style="--md-video-aspect-ratio:9 / 16;"');
    expect(html).toContain("<figcaption>Watch this</figcaption>");
  });

  it("renders YouTube shortcodes from watch and embed URLs", async () => {
    const watchHtml = await renderMarkdown(
      "[[youtube:https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=share]]",
    );
    const embedHtml = await renderMarkdown("[[youtube:https://www.youtube.com/embed/dQw4w9WgXcQ]]");

    expect(watchHtml).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(embedHtml).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
  });

  it("renders YouTube shortcodes with media aliases", async () => {
    const html = await renderMarkdown("[[youtube:launch-video]]", {
      "launch-video": "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    });

    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
  });

  it("does not render unsafe YouTube URLs", async () => {
    const html = await renderMarkdown("[[youtube:https://example.com/watch?v=dQw4w9WgXcQ]]");

    expect(html).toContain("[[youtube:https://example.com/watch?v=dQw4w9WgXcQ]]");
    expect(html).not.toContain("md-youtube-player");
  });
});

describe("stripMarkdown", () => {
  it("removes inline footnote references from plain text", () => {
    expect(stripMarkdown("Dieses Projekt ist eine Herzenssache.[^1] [^2]")).toBe(
      "Dieses Projekt ist eine Herzenssache.",
    );
  });

  it("removes footnote definitions from plain text", () => {
    const text = stripMarkdown(`Intro text with a source.[^source]

[^source]: https://example.com/reference
[^other]: Continued note
  with extra details

Outro text.`);

    expect(text).toBe("Intro text with a source. Outro text.");
  });

  it("keeps regular markdown text readable", () => {
    expect(stripMarkdown("## Title\n\n**Strong** [Link](https://example.com) `code`")).toBe(
      "Title Strong Link code",
    );
  });
});
