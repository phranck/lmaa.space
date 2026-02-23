import { PageLayout } from "@/components/layout/PageLayout.tsx";
import { useContentPage } from "@/features/content/hooks/useContentPage.ts";
import { usePageMeta } from "@/hooks/usePageMeta.ts";
import ReactMarkdown from "react-markdown";

export function AboutPage() {
  usePageMeta({
    title: "Über uns",
    description:
      "lmaa.space ist ein Community-Verzeichnis fairer und nachhaltiger Amazon-Alternativen für den DACH-Raum.",
    canonicalPath: "/ueber-uns",
  });

  const { data: page } = useContentPage("about");

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-10">Über lmaa.space</h1>
        {page && (
          <ReactMarkdown className="prose prose-stone prose-sm max-w-none prose-a:text-amber-700 prose-a:no-underline hover:prose-a:underline prose-headings:font-serif">
            {page.content}
          </ReactMarkdown>
        )}
      </div>
    </PageLayout>
  );
}
