import { type RefObject, useEffect, useRef } from "react";

import { renderMarkdown } from "@/lib/markdown";

/**
 * Renders a Markdown string to HTML and injects it into a container element.
 *
 * Handles async rendering with a race-condition guard so only the latest
 * render result is applied. Returns a ref to attach to the target container.
 *
 * @param source - Markdown source string, or null/undefined to clear.
 * @returns Ref callback to attach to a `<div>` container.
 */
export function useMarkdownHtml(source: string | undefined | null): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const renderKeyRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!source) {
      el.innerHTML = "";
      return;
    }
    const currentKey = ++renderKeyRef.current;
    void renderMarkdown(source).then((html) => {
      if (renderKeyRef.current === currentKey && ref.current) {
        ref.current.innerHTML = html;
      }
    });
  }, [source]);

  return ref;
}
