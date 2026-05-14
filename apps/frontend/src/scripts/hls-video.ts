const initializedPlayers = new WeakSet<HTMLVideoElement>();

async function attachHlsPlayer(video: HTMLVideoElement) {
  const src = video.dataset.hlsSrc?.trim();
  if (!src || initializedPlayers.has(video)) return;

  initializedPlayers.add(video);

  if (
    video.canPlayType("application/vnd.apple.mpegurl") ||
    video.canPlayType("application/x-mpegURL")
  ) {
    video.src = src;
    return;
  }

  const { default: Hls } = await import("hls.js/light");
  if (!Hls.isSupported()) {
    video.dataset.hlsError = "unsupported";
    return;
  }

  const hls = new Hls({ capLevelToPlayerSize: true });
  hls.loadSource(src);
  hls.attachMedia(video);
  video.addEventListener("emptied", () => hls.destroy(), { once: true });
}

function initHlsPlayers(root: ParentNode = document) {
  for (const video of root.querySelectorAll<HTMLVideoElement>("video[data-hls-src]")) {
    void attachHlsPlayer(video).catch(() => {
      video.dataset.hlsError = "load";
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initHlsPlayers(), { once: true });
} else {
  initHlsPlayers();
}

document.addEventListener("astro:page-load", () => initHlsPlayers());
