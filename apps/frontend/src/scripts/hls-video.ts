const initializedPlayers = new WeakSet<HTMLVideoElement>();
const initializedZoomFrames = new WeakSet<HTMLElement>();

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ActiveZoom = {
  frame: HTMLElement;
  overlay: HTMLDivElement;
  placeholder: HTMLDivElement;
  closeButton: HTMLButtonElement;
  onKeyDown: (event: KeyboardEvent) => void;
  onResize: () => void;
  close: () => void;
  isClosing: boolean;
  isFinished: boolean;
};

let activeZoom: ActiveZoom | null = null;

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

function createCloseButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "md-video-close";
  button.setAttribute("aria-label", "Video schließen");
  button.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12" /></svg>';
  return button;
}

function getZoomTargetRect(sourceRect: Rect): Rect {
  const margin = window.innerWidth < 720 ? 12 : 24;
  const maxWidth = Math.max(1, window.innerWidth - margin * 2);
  const maxHeight = Math.max(1, window.innerHeight - margin * 2);
  const aspectRatio =
    sourceRect.width > 0 && sourceRect.height > 0 ? sourceRect.width / sourceRect.height : 16 / 9;

  let width = maxWidth;
  let height = width / aspectRatio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
    width,
    height,
  };
}

function setFrameRect(frame: HTMLElement, rect: Rect) {
  frame.style.left = `${rect.left}px`;
  frame.style.top = `${rect.top}px`;
  frame.style.width = `${rect.width}px`;
  frame.style.height = `${rect.height}px`;
}

function clearFrameInlineStyles(frame: HTMLElement) {
  frame.style.position = "";
  frame.style.left = "";
  frame.style.top = "";
  frame.style.width = "";
  frame.style.height = "";
  frame.style.margin = "";
  frame.style.maxWidth = "";
}

function finishZoomClose(zoom: ActiveZoom, timeoutId: number) {
  if (zoom.isFinished) return;

  zoom.isFinished = true;
  window.clearTimeout(timeoutId);
  zoom.closeButton.remove();
  zoom.placeholder.replaceWith(zoom.frame);
  zoom.overlay.remove();
  zoom.frame.classList.remove("is-zoomed", "is-closing");
  clearFrameInlineStyles(zoom.frame);
  document.documentElement.classList.remove("md-video-zoom-lock");
  window.removeEventListener("keydown", zoom.onKeyDown);
  window.removeEventListener("resize", zoom.onResize);
  if (activeZoom === zoom) {
    activeZoom = null;
  }
}

function closeVideoZoom() {
  const zoom = activeZoom;
  if (!zoom || zoom.isClosing) return;

  zoom.isClosing = true;
  const targetRect = zoom.placeholder.getBoundingClientRect();
  zoom.frame.classList.add("is-closing");
  zoom.overlay.classList.remove("is-visible");
  setFrameRect(zoom.frame, targetRect);

  const timeoutId = window.setTimeout(() => finishZoomClose(zoom, timeoutId), 460);
  zoom.frame.addEventListener(
    "transitionend",
    (event) => {
      if (event.target === zoom.frame) {
        finishZoomClose(zoom, timeoutId);
      }
    },
    { once: true },
  );
}

function openVideoZoom(frame: HTMLElement) {
  if (activeZoom) {
    closeVideoZoom();
    return;
  }

  const sourceRect = frame.getBoundingClientRect();
  const placeholder = document.createElement("div");
  placeholder.style.width = `${sourceRect.width}px`;
  placeholder.style.height = `${sourceRect.height}px`;
  placeholder.style.maxWidth = "100%";

  const overlay = document.createElement("div");
  overlay.className = "md-video-zoom-overlay";

  const closeButton = createCloseButton();
  const targetRect = getZoomTargetRect(sourceRect);

  frame.before(placeholder);
  document.body.append(overlay);
  overlay.append(frame);
  frame.append(closeButton);

  frame.classList.add("is-zoomed");
  frame.style.position = "fixed";
  frame.style.margin = "0";
  frame.style.maxWidth = "none";
  setFrameRect(frame, sourceRect);
  document.documentElement.classList.add("md-video-zoom-lock");

  const close = () => closeVideoZoom();
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") close();
  };
  const onResize = () => {
    if (!activeZoom || activeZoom.isClosing) return;
    setFrameRect(frame, getZoomTargetRect(sourceRect));
  };

  activeZoom = {
    frame,
    overlay,
    placeholder,
    closeButton,
    onKeyDown,
    onResize,
    close,
    isClosing: false,
    isFinished: false,
  };

  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize);

  window.requestAnimationFrame(() => {
    overlay.classList.add("is-visible");
    setFrameRect(frame, targetRect);
  });
}

function initVideoZoomControls(root: ParentNode = document) {
  for (const frame of root.querySelectorAll<HTMLElement>(".md-video-frame")) {
    if (initializedZoomFrames.has(frame)) continue;
    initializedZoomFrames.add(frame);

    const button = frame.querySelector<HTMLButtonElement>("[data-hls-maximize]");
    button?.addEventListener("click", () => openVideoZoom(frame));
  }
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      initHlsPlayers();
      initVideoZoomControls();
    },
    { once: true },
  );
} else {
  initHlsPlayers();
  initVideoZoomControls();
}

document.addEventListener("astro:page-load", () => {
  initHlsPlayers();
  initVideoZoomControls();
});
