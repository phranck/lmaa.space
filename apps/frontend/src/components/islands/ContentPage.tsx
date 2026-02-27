import { API_BASE } from "@/lib/client-api";
import { renderMarkdown } from "@/lib/markdown";
import { useEffect, useState } from "react";

interface Props {
  slug: string;
}

const FALLBACK_PAGES: Record<string, { title: string; content: string }> = {
  about: {
    title: "Über LMAA",
    content:
      "## Inhalt vorübergehend nicht verfügbar\n\nDiese Seite konnte gerade nicht geladen werden. Bitte versuche es in wenigen Minuten erneut.",
  },
  history: {
    title: "Geschichte",
    content:
      "## Inhalt vorübergehend nicht verfügbar\n\nDiese Seite konnte gerade nicht geladen werden. Bitte versuche es in wenigen Minuten erneut.",
  },
  impressum: {
    title: "Impressum",
    content:
      "## Inhalt vorübergehend nicht verfügbar\n\nDiese Seite konnte gerade nicht geladen werden. Bitte versuche es in wenigen Minuten erneut.",
  },
  datenschutz: {
    title: "Datenschutz",
    content:
      "## Inhalt vorübergehend nicht verfügbar\n\nDiese Seite konnte gerade nicht geladen werden. Bitte versuche es in wenigen Minuten erneut.",
  },
};

type State =
  | { type: "loading" }
  | { type: "ready"; title: string; html: string }
  | { type: "not_found" };

export default function ContentPage({ slug }: Props) {
  const [state, setState] = useState<State>({ type: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let page: { title: string; content: string } | null = null;

      try {
        const res = await fetch(`${API_BASE}/content/${slug}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        page = json.data as { title: string; content: string };
      } catch {
        page = FALLBACK_PAGES[slug] ?? null;
      }

      if (cancelled) return;

      if (!page) {
        setState({ type: "not_found" });
        return;
      }

      const html = await renderMarkdown(page.content);
      if (!cancelled) {
        setState({ type: "ready", title: page.title, html });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.type === "not_found") {
    window.location.replace("/404");
    return null;
  }

  if (state.type === "loading") {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-200 rounded w-1/3" />
          <div className="space-y-2 mt-8">
            <div className="h-4 bg-stone-100 rounded" />
            <div className="h-4 bg-stone-100 rounded w-5/6" />
            <div className="h-4 bg-stone-100 rounded w-4/6" />
            <div className="h-4 bg-stone-100 rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-10">{state.title}</h1>
      <article
        className="prose prose-stone prose-base max-w-none prose-a:text-amber-700 prose-a:no-underline hover:prose-a:underline prose-headings:font-serif"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by renderMarkdown (strips HTML blocks, validates hrefs)
        dangerouslySetInnerHTML={{ __html: state.html }}
      />
    </div>
  );
}
